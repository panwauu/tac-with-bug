import logger from '../helpers/logger';
import pg from 'pg'
import * as tDBTypes from '../../../shared/types/typesDBgame';

import { game } from '../game/game';
import { captureMove } from './capture';
import { getStatus } from '../game/serverOutput';
import { updateTournamentFromGame as updatePrivateTournamentFromGame } from './tournamentsPrivate';
import { updateTournamentFromGame as updatePublicTournamentFromGame } from './tournamentsPublic';
import { moveType } from '../../../shared/types/typesBall';
import { expectOneChangeInDatabase } from '../dbUtils/dbHelpers';
import { sendUpdatesOfGameToPlayers } from '../socket/game';
import { emitGamesUpdate, emitRunningGamesUpdate } from '../socket/games';
import { getSocketByUserID } from '../socket/general';

async function queryGamesByID(sqlClient: pg.Pool, gameIDs: number[]) {
    const query = `
        SELECT *, 
            (SELECT users.username as player0 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 0),
            (SELECT users.username as player1 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 1),
            (SELECT users.username as player2 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 2),
            (SELECT users.username as player3 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 3),
            (SELECT users.username as player4 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 4),
            (SELECT users.username as player5 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 5),
            (SELECT users.id as id0 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 0),
            (SELECT users.id as id1 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 1),
            (SELECT users.id as id2 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 2),
            (SELECT users.id as id3 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 3),
            (SELECT users.id as id4 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 4),
            (SELECT users.id as id5 FROM users_to_games JOIN users ON users_to_games.userid=users.id AND gameid=games.id AND player_index = 5)
        FROM games WHERE games.id = ANY($1::int[]) ORDER BY games.id;`
    const dbRes = await sqlClient.query(query, [gameIDs])

    const games: tDBTypes.gameForPlay[] = []

    dbRes.rows.forEach((dbGame) => {
        games.push({
            id: dbGame.id,
            status: dbGame.status,
            nPlayers: dbGame.n_players,
            nTeams: dbGame.n_teams,
            coop: dbGame.game.coop,
            created: Date.parse(dbGame.created),
            lastPlayed: Date.parse(dbGame.lastplayed),
            publicTournamentId: dbGame.public_tournament_id,
            privateTournamentId: dbGame.private_tournament_id,
            players: [...Array(dbGame.n_players).keys()].map((i) => dbGame['player' + i.toString()]),
            playerIDs: [...Array(dbGame.n_players).keys()].map((i) => parseInt(dbGame['id' + i.toString()])),
            game: new game(0, 0, false, false, dbGame.game),
            colors: dbGame.colors,
            rematch_open: dbGame.rematch_open
        })
    })

    return games
}

export async function getGame(sqlClient: pg.Pool, gameID: number) {
    const gameArray = await queryGamesByID(sqlClient, [gameID])
    if (gameArray.length != 1) { throw new Error('GameID does not exist'); }
    return gameArray[0]
}

export async function getGames(sqlClient: pg.Pool, userID: number) {
    const dbRes = await sqlClient.query('SELECT gameid FROM users_to_games WHERE userid=$1;', [userID])
    if (dbRes.rows.length === 0) { return [] }
    return queryGamesByID(sqlClient, dbRes.rows.map((row) => { return row.gameid }))
}

export async function getRunningGames(pgPool: pg.Pool): Promise<tDBTypes.getRunningGamesType[]> {
    const dbRes = await pgPool.query('SELECT id FROM games WHERE status=\'running\';')
    if (dbRes.rows.length === 0) { return [] }
    const games = await queryGamesByID(pgPool, dbRes.rows.map((row) => { return row.id }))
    return games.map((g) => {
        return {
            id: g.id,
            teams: getTeamsFromGame(g),
            created: g.created,
            lastPlayed: g.lastPlayed,
        }
    })
}

export async function createGame(sqlClient: pg.Pool, teamsParam: number, playerIDs: number[], meisterVersion: boolean, coop: boolean, colors: string[], publicTournamentId: number | undefined, privateTournamentId: number | undefined) {
    let teams = teamsParam
    if (playerIDs.length === 6 && teams === 1 && coop === true) {
        teams = 3
    } else if (playerIDs.length === 4) {
        teams = 2;
    }

    const newGame = new game(playerIDs.length, teams, meisterVersion, coop)

    const values = [playerIDs.length, teams, newGame.getJSON(), publicTournamentId, JSON.stringify(colors.slice(0, playerIDs.length)), privateTournamentId]
    const query = 'INSERT INTO games (status, n_players, n_teams, game, public_tournament_id, colors, private_tournament_id) VALUES (\'running\', $1, $2, $3, $4, $5, $6) RETURNING id;'
    const createGameRes = await sqlClient.query(query, values).then((res) => { captureMove(sqlClient, res.rows[0].id, ['init', playerIDs.length, teams, meisterVersion, coop], newGame); return res })
    if (createGameRes.rowCount != 1) { throw new Error('Could not create Game') }

    const userToGameQuery = `
        INSERT INTO users_to_games (userid, gameid, player_index) VALUES 
        ($2, $1, 0), ($3, $1, 1), ($4, $1, 2), ($5, $1, 3) 
        ${playerIDs.length === 6 ? ', ($6, $1, 4), ($7, $1, 5)' : ''};`
    await sqlClient.query(userToGameQuery, [createGameRes.rows[0].id, ...playerIDs])

    return await getGame(sqlClient, createGameRes.rows[0].id)
}

async function updateGame(sqlClient: pg.Pool, gameID: number, gameJSON: string, status: string, setTimeFlag: boolean, openRematchFlag: boolean) {
    const query = `UPDATE games SET game = $1, ${setTimeFlag ? 'lastPlayed = current_timestamp,' : ''} status = $3, rematch_open = $4 WHERE id = $2;`
    const values = [gameJSON, gameID, status, openRematchFlag]
    return sqlClient.query(query, values)
}

export async function abortGame(pgPool: pg.Pool, gameID: number) {
    const game = await getGame(pgPool, gameID)
    if (game.privateTournamentId != null) { await updatePrivateTournamentFromGame(pgPool, game, true) }
    if (game.publicTournamentId != null) { await updatePublicTournamentFromGame(pgPool, game, true) }
    await pgPool.query('UPDATE games SET status=\'aborted\' WHERE id=$1;', [gameID])

    game.playerIDs.forEach((id) => {
        const socket = getSocketByUserID(id)
        socket != null && emitGamesUpdate(pgPool, socket)
    })
    emitRunningGamesUpdate(pgPool)
    sendUpdatesOfGameToPlayers(game)
}

export async function getGamesSummary(sqlClient: pg.Pool, userID: number): Promise<tDBTypes.getGamesType> {
    const games = await getGames(sqlClient, userID);

    return {
        open: games.filter((g) => g.status === 'running').length,
        aborted: games.filter((g) => g.status === 'aborted').length,
        won: games.filter((g) => g.status.substring(0, 4) === 'won-' && g.game.gameEnded && g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]).length,
        lost: games.filter((g) => g.status.substring(0, 4) === 'won-' && g.game.gameEnded && !g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]).length,
        team: games.filter((g) => g.status === 'won').length,
        history: games.filter((g) => g.status.substring(0, 3) === 'won').slice(-10).map((g) => {
            if (g.status === 'won') { return 2 }
            if (g.game.winningTeams[g.game.teams.findIndex((t) => t.includes(g.playerIDs.findIndex((e) => e === userID)))]) {
                return 1
            }
            else {
                return 0
            }
        }),
        runningGames: games.filter((g) => g.status === 'running').map((game) => {
            const order = game.nPlayers === 4 ? [0, 2, 1, 3] : game.nTeams === 2 ? [0, 2, 4, 1, 3, 5] : [0, 3, 1, 4, 2, 5];
            const orderedPlayers = order.map((i) => game.players[i])

            const teams: string[][] = []
            for (let team = 0; team < game.nTeams; team++) {
                const arr: string[] = []
                for (let iterator = 0; iterator < game.players.length / game.nTeams; iterator++) {
                    arr.push(orderedPlayers[team * game.players.length / game.nTeams + iterator])
                }
                teams.push(arr)
            }

            return {
                id: game.id,
                coop: game.game.coop,
                nTeams: game.nTeams,
                nPlayers: game.nPlayers,
                status: 'running',
                created: game.created,
                lastPlayed: game.lastPlayed,
                players: game.players,
                playerIDs: game.playerIDs,
                publicTournamentId: game.publicTournamentId,
                privateTournamentId: game.privateTournamentId,
                nPlayer: game.playerIDs.indexOf(userID),
                teams: teams,
            }
        })
    }
}

function getTeamsFromGame(game: tDBTypes.gameForPlay) {
    const order = game.nPlayers === 4 ? [0, 2, 1, 3] : game.nTeams === 2 ? [0, 2, 4, 1, 3, 5] : [0, 3, 1, 4, 2, 5];
    const orderedPlayers = order.map((i) => game.players[i])

    const teams: string[][] = []
    for (let team = 0; team < game.nTeams; team++) {
        const arr: string[] = []
        for (let iterator = 0; iterator < game.players.length / game.nTeams; iterator++) {
            arr.push(orderedPlayers[team * game.players.length / game.nTeams + iterator])
        }
        teams.push(arr)
    }

    return teams
}

export async function getGamesLazy(sqlClient: pg.Pool, userID: number, first: number, limit: number, sortField: string | undefined, sortOrder: number | undefined) {
    const orderColumn = sortField === 'created' ? 'created' : 'id';
    const values = [userID, limit, first]

    const res = await sqlClient.query(`SELECT games.created, games.id, count(*) OVER() AS n_entries FROM users_to_games JOIN games ON users_to_games.gameid = games.id AND users_to_games.userid = $1 ORDER BY games.${orderColumn} ${sortOrder === 1 ? 'ASC' : 'DESC'} LIMIT $2 OFFSET $3;`, values)
    const nEntries = parseInt(res.rows[0]?.n_entries) || 0
    const idList = res.rows.map((r) => r.id as number)
    const gamesFromDB = await queryGamesByID(sqlClient, idList)

    const games: tDBTypes.gameForOverview[] = gamesFromDB.map((game) => {
        const teams = getTeamsFromGame(game)

        const nPlayer = game.playerIDs.indexOf(userID)

        return {
            id: game.id,
            coop: game.game.coop,
            nTeams: game.nTeams,
            nPlayers: game.nPlayers,
            status: game.status.substring(0, 3) === 'won' && game.status.length > 3 ? game.game.teams[parseInt(game.status.substring(4))].includes(nPlayer) ? 'won' : 'lost' : game.status,
            created: game.created,
            lastPlayed: game.lastPlayed,
            players: game.players,
            playerIDs: game.playerIDs,
            publicTournamentId: game.publicTournamentId,
            privateTournamentId: game.privateTournamentId,
            nPlayer: nPlayer,
            teams: teams,
        }
    })

    return { games: games.sort(gamesSort(orderColumn, sortOrder ?? 1)), nEntries }
}

function gamesSort(sortField: string, sortOrder: number) {
    return function (a: any, b: any) {
        if (a[sortField] < b[sortField]) { return -1 * sortOrder }
        else { return sortOrder }
    }
}

export async function performMoveAndReturnGame(sqlClient: pg.Pool, postMove: moveType, gamePlayer: number, gameID: number) {
    const game = await getGame(sqlClient, gameID)
    if (!game.game.checkMove(postMove) || (postMove != 'dealCards' && postMove[0] != gamePlayer)) {
        throw new Error('Player not allowed to play')
    }
    if (game.status !== 'running') {
        throw new Error('Game has already been ended')
    }
    game.game.performAction(postMove, Math.floor((Date.now() - game.lastPlayed) / 1000))

    if (game.game.gameEnded) {
        game.status = getStatus(game)
        game.rematch_open = true
    }

    await updateGame(sqlClient, gameID, game.game.getJSON(), getStatus(game), !(game.game.tradeFlag && game.game.statistic.filter((s) => s.cards.total[2] > 0).length > 1), game.rematch_open)
    await captureMove(sqlClient, gameID, postMove, game.game)

    if (game.game.gameEnded) {
        game.playerIDs.forEach((id) => {
            const socket = getSocketByUserID(id)
            socket != null && emitGamesUpdate(sqlClient, socket)
        })
        emitRunningGamesUpdate(sqlClient)
    }

    if (game.privateTournamentId != null) { updatePrivateTournamentFromGame(sqlClient, game) }
    if (game.publicTournamentId != null) { updatePublicTournamentFromGame(sqlClient, game) }

    game.lastPlayed = Date.now()

    return game
}

export async function endNotProperlyEndedGames(sqlClient: pg.Pool) {
    const dbRes = await sqlClient.query('SELECT id FROM games WHERE status=\'running\' AND lastplayed < NOW() - INTERVAL \'5 minutes\';')

    dbRes.rows.map(e => e.id).forEach(async (id) => {
        const game = await getGame(sqlClient, id)
        if (game.game.winningTeams.some((e) => e === true)) {
            game.game.gameEnded = true;
            logger.info(`Spiel beendet durch Automat: ID=${id}`)
            await updateGame(sqlClient, id, game.game.getJSON(), getStatus(game), false, false)
            if (game.privateTournamentId != null) { updatePrivateTournamentFromGame(sqlClient, game) }
            if (game.publicTournamentId != null) { updatePublicTournamentFromGame(sqlClient, game) }
            game.playerIDs.forEach((id) => {
                const socket = getSocketByUserID(id)
                socket != null && emitGamesUpdate(sqlClient, socket)
            })
            emitRunningGamesUpdate(sqlClient)
            sendUpdatesOfGameToPlayers(game)
        }
    })
}

export async function abortNotEndedGames(sqlClient: pg.Pool) {
    const dbRes = await sqlClient.query('SELECT id FROM games WHERE status=\'running\' AND lastplayed < NOW() - INTERVAL \'2 hours\';')
    dbRes.rows.forEach(async (row) => { await abortGame(sqlClient, row.id) })
}

export async function disableRematchOfGame(pgPool: pg.Pool, id: number) {
    const dbRes = await pgPool.query('UPDATE games SET rematch_open = FALSE WHERE id = $1;', [id])
    expectOneChangeInDatabase(dbRes)
}

export async function disableRematchOfOldGames(pgPool: pg.Pool): Promise<number[]> {
    const dbRes = await pgPool.query<{ id: number }>('UPDATE games SET rematch_open = FALSE WHERE rematch_open = TRUE AND current_timestamp - lastplayed > interval \'3 minutes\' RETURNING id;')
    return dbRes.rows.map((r) => r.id)
}