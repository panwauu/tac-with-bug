import { cloneDeep } from 'lodash'
import { err, ok, Result } from 'neverthrow'
import { ballPlayer } from '../game/ballUtils'
import { gameForPlay } from '../../../shared/types/typesDBgame'
import { koBracket, privateTournament, publicTournament, tournamentDataKO } from '../../../shared/types/typesTournament'
import { shuffleArray } from '../game/cardUtils'

export type createTournamentDataKOError = 'N_TEAMS_NOT_VALID_FOR_KO' | 'RANDOM_TEAM_CREATION_ERROR'
export function createTournamentDataKO(nTeams: number, teamsPerMatch: 2 | 3): Result<tournamentDataKO, createTournamentDataKOError> {
    let nRounds = Math.log(nTeams) / Math.log(teamsPerMatch);
    if (nRounds % 1 > 10e-10) { return err('N_TEAMS_NOT_VALID_FOR_KO') }
    nRounds = Math.round(nRounds)

    const brackets: koBracket[][] = []
    for (let iRound = 0; iRound < nRounds; iRound++) {
        brackets.push([])
        for (let iBracket = 0; iBracket < Math.pow(teamsPerMatch, nRounds - 1 - iRound); iBracket++) {
            brackets[iRound].push({ score: [0, 0], winner: -1, teams: [-1, -1], gameID: -1 })
        }
    }
    if (nRounds > 1) { // Create Bracket for 3rd place game
        brackets[nRounds - 1].push({ score: [0, 0], winner: -1, teams: [-1, -1], gameID: -1 })
    }

    const shuffledPlayers = [...Array(nTeams).keys()];
    shuffleArray(shuffledPlayers)
    for (const [bracketIndex, b] of brackets[0].entries()) {
        for (const [teamIndex] of b.teams.entries()) {
            const next = shuffledPlayers.pop()
            if (next === undefined) { return err('RANDOM_TEAM_CREATION_ERROR') }
            brackets[0][bracketIndex].teams[teamIndex] = next
        }
    }

    return ok({ brackets: brackets })
}

type findBracketError = 'GAME_NOT_IN_KO_BRACKETS'
function findBracket(tournament: publicTournament | privateTournament, gameID: number): Result<[number, number], findBracketError> {
    const firstIndex = tournament.data.brackets.findIndex((round) => { return round.some((game) => game.gameID === gameID) })
    if (firstIndex === -1) { return err('GAME_NOT_IN_KO_BRACKETS') }
    const secondIndex = tournament.data.brackets[firstIndex].findIndex((m) => m.gameID === gameID)
    if (secondIndex === -1) { return err('GAME_NOT_IN_KO_BRACKETS') }
    return ok([firstIndex, secondIndex])
}

function addScoreAndReturnChangedFlag(game: gameForPlay, tournament: publicTournament | privateTournament, pos: [number, number]): boolean {
    const score = tournament.data.brackets[pos[0]][pos[1]].score.map(() => 0);

    game.players.forEach((p, pI) => {
        const count = game.game.balls.filter((b, bI) => { return (ballPlayer(bI) === pI && (b.state === 'locked' || b.state === 'goal')) }).length
        const tournamentT = tournament.teams.findIndex((t) => t.players.includes(p))
        const tournamentTI = tournament.data.brackets[pos[0]][pos[1]].teams.findIndex((t) => t === tournamentT)
        score[tournamentTI] += count;
    })

    if (score.some((s, i) => s !== tournament.data.brackets[pos[0]][pos[1]].score[i])) {
        tournament.data.brackets[pos[0]][pos[1]].score = score
        return true;
    }

    return false
}

type updateScoreError = findBracketError
export function updateScore(tournament: publicTournament | privateTournament, game: gameForPlay): Result<boolean, updateScoreError> {
    const pos = findBracket(tournament, game.id)
    if (pos.isErr()) { return err(pos.error) }
    const changed = addScoreAndReturnChangedFlag(game, tournament, pos.value)
    return ok(changed)
}

export type getWinnerOfTournamentGameError = 'WINNER_OF_TOURNAMENT_GAME_NOT_FOUND'
function getWinnerOfTournamentGame(game: gameForPlay, bracket: koBracket, tournament: publicTournament | privateTournament): Result<number, getWinnerOfTournamentGameError> {
    if (game.status.substring(0, 3) === 'won') {
        const gameWinningTeam = parseInt(game.status[4])
        const gameWinningPlayer = game.players[game.game.teams[gameWinningTeam][0]]
        const bracketWinningTeam = bracket.teams.find((t) => { return tournament.teams[t].players.includes(gameWinningPlayer) })
        if (bracketWinningTeam === undefined) { return err('WINNER_OF_TOURNAMENT_GAME_NOT_FOUND') }
        return ok(bracketWinningTeam)
    }

    // if no moves were made -> random
    if (game.game.statistic.every((pS) => { return pS.actions.nMoves === 0 })) {
        return ok(bracket.teams[Math.floor(Math.random() * bracket.teams.length)]);
    }

    // get Statistic with time since lastplayed
    let players: number[] = []
    if (game.game.tradeFlag) {
        players = game.game.tradeCards.map((c, i) => { return { card: c, index: i } }).filter((c) => c.card === '').map((c) => c.index)
    } else if (game.game.narrFlag.some((f) => f === true)) {
        players = game.game.narrFlag.map((f, i) => { return { flag: f, index: i } }).filter((f) => f.flag === false).map((f) => f.index)
    } else {
        players = [game.game.activePlayer]
    }

    const statisticsCopy = cloneDeep(game.game.statistic);
    players.forEach((nPlayer) => {
        const time = Math.floor((Date.now() - game.lastPlayed) / 1000);
        statisticsCopy[nPlayer].actions.timePlayed += time
        statisticsCopy[nPlayer].actions.nMoves += 1
    })

    // Get Time Played by each Team
    const timePerTeam: number[] = new Array(game.game.teams.length).fill(0);
    timePerTeam.forEach((_, i) => {
        game.game.teams[i].forEach((p) => {
            timePerTeam[i] += statisticsCopy[p].actions.timePlayed
        })
    })

    // Get tournament Team with the lowest Time
    const gameWinningTeam = timePerTeam.indexOf(Math.min(...timePerTeam));
    const gameWinningPlayer = game.players[game.game.teams[gameWinningTeam][0]]
    const bracketWinningTeam = bracket.teams.find((t) => { return tournament.teams[t].players.includes(gameWinningPlayer) })
    if (bracketWinningTeam === undefined) { return err('WINNER_OF_TOURNAMENT_GAME_NOT_FOUND') }
    return ok(bracketWinningTeam)
}

export type evaluateGameWinnerAndReturnEndedFlagError = 'LOOSER_COULD_NOT_BE_FOUND' | getWinnerOfTournamentGameError | findBracketError
export function evaluateGameWinnerAndReturnEndedFlag(game: gameForPlay, tournament: publicTournament | privateTournament): Result<boolean, evaluateGameWinnerAndReturnEndedFlagError> {
    const pos = findBracket(tournament, game.id)
    if (pos.isErr()) { return err(pos.error) }

    addScoreAndReturnChangedFlag(game, tournament, pos.value)
    const winner = getWinnerOfTournamentGame(game, tournament.data.brackets[pos.value[0]][pos.value[1]], tournament)
    if (winner.isErr()) { return err(winner.error) }

    tournament.data.brackets[pos.value[0]][pos.value[1]].winner = winner.value

    if (pos.value[0] <= tournament.data.brackets.length - 2) {
        tournament.data.brackets[pos.value[0] + 1][Math.floor(pos.value[1] / 2)].teams[pos.value[1] % 2] = winner.value
    }

    if (pos.value[0] === tournament.data.brackets.length - 2) {
        const looser = tournament.data.brackets[pos.value[0]][pos.value[1]].teams.find((t) => t !== winner.value)
        if (looser === undefined) { return err('LOOSER_COULD_NOT_BE_FOUND') }
        tournament.data.brackets[pos.value[0] + 1][Math.floor(pos.value[1] / 2) + 1].teams[pos.value[1] % 2] = looser
    }

    return ok(tournament.data.brackets[tournament.data.brackets.length - 1].every((m) => m.winner !== -1))
}
