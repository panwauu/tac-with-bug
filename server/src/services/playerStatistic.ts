import pg from 'pg';
import * as tStatistic from '../../../shared/types/typesStatistic';
import * as tDBgame from '../../../shared/types/typesDBgame';
import type { playerFrontendStatistic } from '../../../shared/types/typesPlayerStatistic';

import { initalizeStatistic } from '../game/statistic';
import { getGames } from './game';
import { ballPlayer } from '../game/ballUtils';
import { isSubscribed } from '../paypal/paypal';
import { getUser } from './user';
import { isHofMember } from './hof';

const lastGamesHistoryLength = 10;

function intializePlayerStatistic(): tStatistic.playerStatistic {
    return {
        ...initalizeStatistic(1)[0], ...{
            wl: {
                nGamesWon4: 0,
                nGamesWon6: 0,
                nGamesLost4: 0,
                nGamesLost6: 0,
                nGamesCoopWon: 0,
                nGamesCoopAborted: 0,
                nGamesAborted: 0,
                nGamesRunning: 0,
                ballsInOwnTeam: 0,
                ballsInEnemy: 0,
                lastGamesHistory: [],
                people: {},
                coopBest4: 1000,
                coopBest6: 1000,
            }
        }
    }
}

function addWLStatisticAborted(playerStatistic: tStatistic.playerStatistic, game: tDBgame.gameForPlay) {
    if (game.coop) { playerStatistic.wl.nGamesCoopAborted += 1; }
    else { playerStatistic.wl.nGamesAborted += 1; }
    addToGamesHistory(playerStatistic, 'aborted');
}

function addWLStatisticCoop(playerStatistic: tStatistic.playerStatistic, game: tDBgame.gameForPlay, nPlayer: number) {
    playerStatistic.wl.nGamesCoopWon += 1
    const nMovesToWin = game.game.statistic.reduce(function (accumulator, currentValue) {
        return accumulator + currentValue.cards.total[0];
    }, 0)
    if (game.game.nPlayers === 4) {
        playerStatistic.wl.coopBest4 = Math.min(playerStatistic.wl.coopBest4, nMovesToWin)
    } else {
        playerStatistic.wl.coopBest6 = Math.min(playerStatistic.wl.coopBest6, nMovesToWin)
    }

    game.players.forEach((player, playerIndex) => {
        if (playerIndex !== nPlayer && player != null) {
            if (!(player in playerStatistic.wl.people)) { playerStatistic.wl.people[player] = [0, 0, 0, 0, 0] }
            playerStatistic.wl.people[player][4] += 1
        }
    })

    addToGamesHistory(playerStatistic, 'coop')
}

function addWLStatisticWonLost(playerStatistic: tStatistic.playerStatistic, game: tDBgame.gameForPlay, nPlayer: number) {
    // Won - Lost
    const ownTeamIndex = game.game.teams.findIndex((team) => team.includes(nPlayer))
    if (game.nPlayers === 4) {
        game.game.winningTeams[ownTeamIndex] ? playerStatistic.wl.nGamesWon4 += 1 : playerStatistic.wl.nGamesLost4 += 1;
    } else {
        game.game.winningTeams[ownTeamIndex] ? playerStatistic.wl.nGamesWon6 += 1 : playerStatistic.wl.nGamesLost6 += 1;
    }
    addToGamesHistory(playerStatistic, game.game.winningTeams[ownTeamIndex] ? 'won' : 'lost')

    // ballsInOwnTeam - ballsInEnemy
    playerStatistic.wl.ballsInOwnTeam += game.game.balls
        .filter((_, ballIndex) => game.game.teams[ownTeamIndex].includes(ballPlayer(ballIndex)))
        .filter((ball) => ball.state === 'goal' || ball.state === 'locked').length
    playerStatistic.wl.ballsInEnemy += game.game.balls
        .filter((_, ballIndex) => !game.game.teams[ownTeamIndex].includes(ballPlayer(ballIndex)))
        .filter((ball) => (ball.state === 'goal' || ball.state === 'locked')).length

    addToPlayers(playerStatistic, game, nPlayer, ownTeamIndex)
}

function addToPlayers(playerStatistic: tStatistic.playerStatistic, game: tDBgame.gameForPlay, nPlayer: number, ownTeamIndex: number) {
    // bestFriend worstEnemy --- [togetherTotal, togetherWon, againstTotal, againstWon]
    game.players.forEach((player, playerIndex) => {
        if (playerIndex !== nPlayer && player != null) {
            if (!(player in playerStatistic.wl.people)) { playerStatistic.wl.people[player] = [0, 0, 0, 0, 0] }

            playerStatistic.wl.people[player][4] += 1
            if (game.game.teams[ownTeamIndex].includes(playerIndex)) {
                playerStatistic.wl.people[player][0] += 1
                playerStatistic.wl.people[player][1] += (game.game.winningTeams[ownTeamIndex] ? 1 : 0)
            } else {
                playerStatistic.wl.people[player][2] += 1
                playerStatistic.wl.people[player][3] += (game.game.winningTeams[ownTeamIndex] ? 1 : 0)
            }
        }
    })
}

export function addWLStatistic(playerStatistic: tStatistic.playerStatistic, game: tDBgame.gameForPlay, nPlayer: number) {
    if (game.status === 'aborted') { return addWLStatisticAborted(playerStatistic, game) }

    if (game.status === 'running') {
        playerStatistic.wl.nGamesRunning += 1;
        addToGamesHistory(playerStatistic, 'running');
        return
    }

    if (game.game.coop) { return addWLStatisticCoop(playerStatistic, game, nPlayer) }

    addWLStatisticWonLost(playerStatistic, game, nPlayer)
}

function addToGamesHistory(playerStatistic: tStatistic.playerStatistic, status: 'won' | 'lost' | 'coop' | 'aborted' | 'running') {
    playerStatistic.wl.lastGamesHistory = playerStatistic.wl.lastGamesHistory
        .slice(Math.max(0, playerStatistic.wl.lastGamesHistory.length + 1 - lastGamesHistoryLength))
        .concat([status])
}

function addActionStatistic(playerStatistic: tStatistic.playerStatistic, gameStatistic: tStatistic.gameStatistic) {
    (Object.keys(playerStatistic.actions) as Array<keyof tStatistic.gameStatisticActionsType>).forEach((key) => {
        playerStatistic.actions[key] += gameStatistic.actions[key]
    })
}

function addCardsStatistic(playerStatistic: tStatistic.playerStatistic, gameStatistic: tStatistic.gameStatistic) {
    (Object.keys(playerStatistic.cards) as Array<keyof tStatistic.gameStatisticCardsType>).forEach((key) => {
        playerStatistic.cards[key][0] += gameStatistic.cards[key][0]
        playerStatistic.cards[key][1] += gameStatistic.cards[key][1]
        playerStatistic.cards[key][2] += gameStatistic.cards[key][2]
    })
}

export async function getPlayerStats(sqlClient: pg.Pool, userID: number) {
    const games = await getGames(sqlClient, userID);
    games.sort((a, b) => (a.lastPlayed > b.lastPlayed) ? 1 : -1)
    const sum = intializePlayerStatistic()
    for (const game of games) {
        const player_index = game.playerIDs.findIndex((id) => id === userID);
        addActionStatistic(sum, game.game.statistic[player_index])
        addCardsStatistic(sum, game.game.statistic[player_index])
        addWLStatistic(sum, game, player_index);
    }
    return sum
}

export async function getDataForProfilePage(sqlClient: pg.Pool, username: string): Promise<playerFrontendStatistic> {
    const user = await getUser(sqlClient, { username: username })
    if (user.isErr()) { throw new Error(user.error) }
    const userID = user.value.id

    const stat = await getPlayerStats(sqlClient, userID)

    const sub = await isSubscribed(sqlClient, username, false)
    const subscribed = sub.isErr() ? false : sub.value

    return {
        history: stat.wl.lastGamesHistory,
        players: findPlayersFromStat(stat.wl),
        table: (stat.wl.nGamesCoopWon + stat.wl.nGamesCoopAborted + stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6) === 0 ? [0, 0, 0, 0, 0, 0, 0] : [
            ((stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6) > 0 ? Math.round((stat.wl.nGamesWon4 + stat.wl.nGamesWon6) / (stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6) * 100) : 0),
            Math.round(countTradedSpecialCards(stat.cards) / stat.cards['total'][2] * 100),
            Math.round(100 * (stat.actions.nBallsKickedEnemy + stat.actions.nBallsKickedOwnTeam + stat.actions.nBallsKickedSelf) / (stat.actions.nBallsKickedEnemy + stat.actions.nBallsKickedOwnTeam + stat.actions.nBallsKickedSelf + stat.actions.nBallsLost)),
            Math.round(100 * Math.min(1, 10 / (stat.actions.timePlayed / stat.actions.nMoves))),
            Math.round(stat.actions.nAussetzen / stat.cards['8'][1] * 100),
            Math.round(stat.cards['total'][1] / stat.cards['total'][0] * 100),
            Math.round(100 - (100 * stat.wl.nGamesAborted / (stat.wl.nGamesCoopWon + stat.wl.nGamesCoopAborted + stat.wl.nGamesLost4 + stat.wl.nGamesLost6 + stat.wl.nGamesWon4 + stat.wl.nGamesWon6 + stat.wl.nGamesAborted))),
        ],
        gamesDistribution: {
            teamWon: stat.wl.nGamesCoopWon,
            teamAborted: stat.wl.nGamesCoopAborted,
            won4: stat.wl.nGamesWon4,
            lost4: stat.wl.nGamesLost4,
            won6: stat.wl.nGamesWon6,
            lost6: stat.wl.nGamesLost6,
            aborted: stat.wl.nGamesAborted,
            running: stat.wl.nGamesRunning,
        },
        subscriber: subscribed,
        people: stat.wl.people,
        hof: await isHofMember(sqlClient, username),
        userDescription: user.value.userDescription,
        registered: user.value.registered,
    }
}

function countTradedSpecialCards(stat: any) {
    let total = 0;
    Object.keys(stat).forEach((key) => {
        if (key !== 'total') { total += stat[key][2] }
    })
    return total
}

function findPlayersFromStat(wl: tStatistic.playerWLStatistic) {
    const res = {
        mostFrequent: '',
        bestPartner: '',
        worstEnemy: '',
    }

    if (Object.keys(wl.people).length === 0) { return res }

    const keys = Object.keys(wl.people)
    keys.forEach((key) => {
        if (res.mostFrequent === '' || wl.people[key][4] > wl.people[res.mostFrequent][4]) { res.mostFrequent = key }

        if (res.bestPartner === '' && wl.people[key][0] > 0 ||
            (wl.people[key][0] > 0 &&
                (wl.people[key][1] / wl.people[key][0] > wl.people[res.bestPartner][1] / wl.people[res.bestPartner][0]))) { res.bestPartner = key }

        if (res.worstEnemy === '' && wl.people[key][2] > 0 ||
            (wl.people[key][2] > 0 &&
                (wl.people[key][3] / wl.people[key][2] < wl.people[res.worstEnemy][3] / wl.people[res.worstEnemy][2]))) {
            res.worstEnemy = key
        }
    })

    return res
}

function getUserNetworkFromGamesNodes(games: tDBgame.gameForPlay[]): tStatistic.userNetworkNode[] {
    const nodesLimit = 30;
    const nodes: tStatistic.userNetworkNode[] = []

    for (const game of games) {
        for (let playerInd = 0; playerInd < game.players.length; playerInd++) {
            if (game.players[playerInd] === '' || game.players[playerInd] == null) { continue }

            const playerIndexInNodes = nodes.findIndex((n) => n.data.idInt === game.playerIDs[playerInd])
            if (playerIndexInNodes === -1) {
                nodes.push({
                    'data': {
                        'id': game.playerIDs[playerInd].toString(),
                        'idInt': game.playerIDs[playerInd],
                        'name': game.players[playerInd],
                        'score': 1
                    },
                })
            } else {
                nodes[playerIndexInNodes].data.score += 1
            }
        }
    }

    return nodes.sort((n) => n.data.score).slice(0, nodesLimit)
}

function getUserNetworkFromGamesEdges(games: tDBgame.gameForPlay[], nodes: tStatistic.userNetworkNode[], edges: tStatistic.userNetworkEdge[], playerInd: number, gamesInd: number) {
    for (let playerEdgeInd = playerInd + 1; playerEdgeInd < games[gamesInd].players.length; playerEdgeInd++) {
        if (nodes.findIndex((n) => n.data.idInt === games[gamesInd].playerIDs[playerEdgeInd]) === -1) { continue }
        if (games[gamesInd].players[playerEdgeInd] === '' || games[gamesInd].players[playerEdgeInd] == null) { continue }

        const together = games[gamesInd].game.teams.some((t) => t.includes(playerInd) && t.includes(playerEdgeInd))

        const edgeIndex = edges.findIndex((n) => {
            return (
                n.data.source === games[gamesInd].playerIDs[playerInd].toString() && n.data.target === games[gamesInd].playerIDs[playerEdgeInd].toString() && n.data.together === together ||
                n.data.target === games[gamesInd].playerIDs[playerInd].toString() && n.data.source === games[gamesInd].playerIDs[playerEdgeInd].toString() && n.data.together === together)
        })
        if (edgeIndex === -1) {
            edges.push({
                'data': {
                    'source': games[gamesInd].playerIDs[playerInd].toString(),
                    'target': games[gamesInd].playerIDs[playerEdgeInd].toString(),
                    'weight': 1,
                    together: together,
                    'id': `e${edges.length}`
                },
            })
        } else {
            edges[edgeIndex].data.weight += 1
        }
    }
}

function getUserNetworkFromGames(allGames: tDBgame.gameForPlay[], userID: number, username: string): tStatistic.userNetwork {
    const games = allGames.filter((g) => g.status !== 'aborted' && g.status !== 'running')

    const nodes = getUserNetworkFromGamesNodes(games)

    const edges: tStatistic.userNetworkEdge[] = []
    for (let gamesInd = 0; gamesInd < games.length; gamesInd++) {
        for (let playerInd = 0; playerInd < games[gamesInd].players.length; playerInd++) {
            if (nodes.findIndex((n) => n.data.idInt === games[gamesInd].playerIDs[playerInd]) === -1) { continue }
            getUserNetworkFromGamesEdges(games, nodes, edges, playerInd, gamesInd)
        }
    }


    nodes.forEach((n) => { n.data.score = n.data.score / games.length })
    const edgeWeightMax = Math.max(...edges.map((e) => e.data.weight))
    edges.forEach((n) => { n.data.weight = n.data.weight / edgeWeightMax })

    if (nodes.length === 0) {
        nodes.push({
            'data': {
                'id': userID.toString(),
                'idInt': userID,
                'name': username,
                'score': 1
            },
        })
    }

    return { nodes, edges }
}

export async function getUserNetworkData(sqlClient: pg.Pool, username: string): Promise<tStatistic.userNetworkApiResponse> {
    const user = await getUser(sqlClient, { username: username })
    if (user.isErr()) { throw new Error(user.error) }

    const games = await getGames(sqlClient, user.value.id)

    const stat = await getPlayerStats(sqlClient, user.value.id)
    const graph = getUserNetworkFromGames(games, user.value.id, username)
    return { graph: graph, people: stat.wl.people }
}
