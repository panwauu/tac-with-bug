import type pg from 'pg'
import { getGames, getRunningGamesOfUser } from './game'
import { getBotName } from '@repo/core/bot/names'
import { convertGameOrderToArrayPerTeam } from '@repo/core/game/teamUtils'

// The list as it was built before, by loading every game of the user with its full state. A player who was substituted
// out holds no seat anymore and does not see the game, exactly as getRunningGamesOfUser decides it now.
async function previousRunningGamesOfUser(sqlClient: pg.Pool, userID: number) {
  const games = await getGames(sqlClient, userID)
  const isSeated = (g: (typeof games)[number]) => g.playerIDs.indexOf(userID) >= 0 && g.playerIDs.indexOf(userID) < g.nPlayers

  return games
    .filter((g) => g.running && isSeated(g))
    .map((game) => {
      const teams = convertGameOrderToArrayPerTeam(
        game.players.slice(0, game.nPlayers).map((p, i) => p ?? getBotName(game.id, i)),
        game.nPlayers,
        game.nTeams
      )

      return {
        id: game.id,
        running: game.running,
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
        bots: game.bots,
      }
    })
}

type StoredGame = Record<string, unknown>
// What the game means for EDGE_USER: 'substitute' = replaced in an ended game (aborted and, being in no team, lost)
type Outcome = 'won' | 'lost' | 'team' | 'aborted' | 'open' | 'substitute'
type NewGame = { running: boolean; nPlayers: 4 | 6; nTeams: 2 | 3; game: StoredGame; seatOfUser: number; outcome: Outcome }

// Users without games in populate_test.sql: the edge cases belong to EDGE_USER, the other seats to TABLE_MATES.
const EDGE_USER = 9
const TABLE_MATES = [10, 11, 12, 13, 14, 15]
const MALFORMED_USER = 16

async function insertGame(g: Omit<NewGame, 'outcome'>, user: number) {
  const res = await testServer.pgPool.query<{ id: number }>('INSERT INTO games (running, n_players, n_teams, game) VALUES ($1, $2, $3, $4) RETURNING id;', [
    g.running,
    g.nPlayers,
    g.nTeams,
    JSON.stringify(g.game),
  ])
  const gameID = res.rows[0].id
  const mates = [...TABLE_MATES]
  for (let seat = 0; seat < g.nPlayers; seat++) {
    const userID = seat === g.seatOfUser ? user : mates.shift()
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [userID, gameID, seat])
  }
  if (g.seatOfUser >= g.nPlayers) {
    // A substitute: the replaced user keeps a seat index beyond the players
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [user, gameID, g.seatOfUser])
  }
  return gameID
}

function without(game: StoredGame, key: string): StoredGame {
  return Object.fromEntries(Object.entries(game).filter(([k]) => k !== key))
}

describe('Running games of a user', () => {
  const teams4 = [
    [0, 2],
    [1, 3],
  ]
  let template4: StoredGame
  const inserted: Array<{ id: number; outcome: Outcome; running: boolean }> = []

  beforeAll(async () => {
    // Every test file has its own copy of populate_test.sql, so the games added here stay in this file.
    template4 = (await testServer.pgPool.query<{ game: StoredGame }>('SELECT game FROM games WHERE n_players = 4 ORDER BY id LIMIT 1;')).rows[0].game
    const template6 = (await testServer.pgPool.query<{ game: StoredGame }>('SELECT game FROM games WHERE n_players = 6 ORDER BY id LIMIT 1;')).rows[0].game
    expect(template4).toBeDefined()
    expect(template6).toBeDefined()

    const teams63 = [
      [0, 3],
      [1, 4],
      [2, 5],
    ]
    const teams62 = [
      [0, 2, 4],
      [1, 3, 5],
    ]
    const ended4 = (winningTeams: boolean[], seatOfUser: number, outcome: Outcome): NewGame => ({
      running: false,
      nPlayers: 4,
      nTeams: 2,
      game: { ...template4, coop: false, gameEnded: true, teams: teams4, winningTeams },
      seatOfUser,
      outcome,
    })
    const running4 = (game: StoredGame, seatOfUser: number, outcome: Outcome): NewGame => ({ running: true, nPlayers: 4, nTeams: 2, game, seatOfUser, outcome })
    const notEnded = { ...template4, coop: false, gameEnded: false, teams: teams4, winningTeams: [false, false] }

    const cases: NewGame[] = []
    // 4 players, 2 teams: every seat with each result -> 4 won, 8 lost
    for (let seat = 0; seat < 4; seat++) {
      for (const winningTeams of [
        [true, false],
        [false, true],
        [false, false],
      ]) {
        cases.push(ended4(winningTeams, seat, winningTeams[seat % 2] ? 'won' : 'lost'))
      }
    }
    // 6 players, 3 teams: every seat with each winning team -> 6 won, 12 lost
    for (let seat = 0; seat < 6; seat++) {
      for (let winner = 0; winner < 3; winner++) {
        const winningTeams = [0, 1, 2].map((t) => t === winner)
        const game = { ...template6, coop: false, gameEnded: true, teams: teams63, winningTeams }
        cases.push({ running: false, nPlayers: 6, nTeams: 3, game, seatOfUser: seat, outcome: seat % 3 === winner ? 'won' : 'lost' })
      }
    }
    // 6 players, 2 teams, the second team won -> 3 won, 3 lost
    for (let seat = 0; seat < 6; seat++) {
      const game = { ...template6, coop: false, gameEnded: true, teams: teams62, winningTeams: [false, true] }
      cases.push({ running: false, nPlayers: 6, nTeams: 2, game, seatOfUser: seat, outcome: seat % 2 === 1 ? 'won' : 'lost' })
    }
    // Replaced in an ended game -> 1 aborted, 1 lost
    cases.push(ended4([true, false], 4, 'substitute'))
    // Replaced in a running game -> 1 aborted, not open
    cases.push(running4(notEnded, 5, 'aborted'))
    // An aborted game -> 1 aborted
    cases.push({ running: false, nPlayers: 4, nTeams: 2, game: notEnded, seatOfUser: 1, outcome: 'aborted' })
    // An ended team game, stored like the server stores it (two teams, no winning team) -> 1 team
    cases.push({
      running: false,
      nPlayers: 4,
      nTeams: 2,
      game: { ...template4, coop: true, gameEnded: true, teams: teams4, winningTeams: [false, false] },
      seatOfUser: 2,
      outcome: 'team',
    })
    // Stored without "coop" (not a team game) -> 1 won; stored without "gameEnded" (not ended) -> 1 aborted
    cases.push({ ...ended4([true, false], 0, 'won'), game: without(ended4([true, false], 0, 'won').game, 'coop') })
    cases.push({ ...ended4([false, false], 0, 'aborted'), game: without(ended4([false, false], 0, 'aborted').game, 'gameEnded') })
    // Two running games, one of them stored with "teams": null -> 2 open
    cases.push(running4(notEnded, 3, 'open'))
    cases.push(running4({ ...notEnded, teams: null }, 0, 'open'))

    // Insert in a fixed shuffled order, so that "the last ten" by game id mix all kinds of results
    let seed = 20261014
    const shuffled = cases
      .map((c, i) => {
        seed = (seed * 1103515245 + 12345) % 2147483648
        return { c, i, key: seed }
      })
      .sort((a, b) => a.key - b.key || a.i - b.i)
      .map(({ c }) => c)
    for (const c of shuffled) {
      inserted.push({ id: await insertGame(c, EDGE_USER), outcome: c.outcome, running: c.running })
    }
  })

  // A pool that records every query, to see what the endpoint reads
  function recordingPool() {
    const calls: Array<{ text: string; values: unknown[] }> = []
    const pool = {
      query: (text: string, values?: unknown[]) => {
        calls.push({ text, values: values ?? [] })
        return testServer.pgPool.query(text, values)
      },
    } as unknown as pg.Pool
    return { pool, calls }
  }

  test('returns exactly what the previous implementation returned, for every user', async () => {
    const users = await testServer.pgPool.query<{ id: number }>('SELECT id FROM users ORDER BY id;')
    expect(users.rows.length).toBeGreaterThan(10)
    let withRunningGames = 0
    for (const { id } of users.rows) {
      const games = await getRunningGamesOfUser(testServer.pgPool, id)
      const previous = await previousRunningGamesOfUser(testServer.pgPool, id)
      expect(games).toStrictEqual(previous)
      expect(JSON.stringify(games)).toBe(JSON.stringify(previous))
      if (previous.length > 0) withRunningGames++
    }
    expect(withRunningGames).toBeGreaterThan(1)
  })

  test('lists the running games of the user and nothing else', async () => {
    const games = await getRunningGamesOfUser(testServer.pgPool, EDGE_USER)
    const runningIDs = inserted.filter((g) => g.outcome === 'open').map((g) => g.id)
    expect(runningIDs).toHaveLength(2)
    expect(games.map((g) => g.id)).toEqual(runningIDs.sort((a, b) => a - b))
    // None of the finished games of this user - won, lost, team games, aborted ones - is in the list
    expect(inserted.filter((g) => !g.running).length).toBeGreaterThan(10)
    expect(games.every((g) => g.running)).toBe(true)
    // Replaced in a running game: not listed, as before
    const replacedRunning = inserted.filter((g) => g.running && g.outcome === 'aborted').map((g) => g.id)
    expect(replacedRunning).toHaveLength(1)
    expect(games.map((g) => g.id)).not.toContain(replacedRunning[0])
  })

  test('reads no finished game', async () => {
    const { pool, calls } = recordingPool()
    await getRunningGamesOfUser(pool, EDGE_USER)
    // One query for the ids of the running games (no game JSON), one full load of exactly these games
    expect(calls).toHaveLength(2)
    expect(calls[0].text).not.toMatch(/games\.game\b|game->|game @>/)
    const runningIDs = inserted
      .filter((g) => g.outcome === 'open')
      .map((g) => g.id)
      .sort((a, b) => a - b)
    expect(calls[1].values[0]).toEqual(runningIDs)

    // The user with the most games among those with finished games only: a single query, nothing is loaded
    const finishedOnlyUser = (
      await testServer.pgPool.query<{ userid: number; n: string }>(
        `SELECT userid, count(*) AS n FROM users_to_games JOIN games ON games.id = users_to_games.gameid
         GROUP BY userid HAVING bool_and(NOT games.running) ORDER BY count(*) DESC, userid LIMIT 1;`
      )
    ).rows[0]
    expect(Number(finishedOnlyUser.n)).toBeGreaterThan(0)
    const finishedOnly = recordingPool()
    expect(await getRunningGamesOfUser(finishedOnly.pool, finishedOnlyUser.userid)).toStrictEqual([])
    expect(finishedOnly.calls).toHaveLength(1)
  })

  test('drops a game that ended between the two queries', async () => {
    // The second query (full load) reports the first running game as no longer running
    const calls: string[] = []
    const pool = {
      query: async (text: string, values?: unknown[]) => {
        calls.push(text)
        const res = await testServer.pgPool.query(text, values)
        if (calls.length === 2) res.rows[0].running = false
        return res
      },
    } as unknown as pg.Pool
    const games = await getRunningGamesOfUser(pool, EDGE_USER)
    const runningIDs = inserted
      .filter((g) => g.outcome === 'open')
      .map((g) => g.id)
      .sort((a, b) => a - b)
    expect(calls).toHaveLength(2)
    expect(games.map((g) => g.id)).toEqual(runningIDs.slice(1))
  })

  test('is not disturbed by a finished game with stored JSON that cannot be read', async () => {
    // "teams" is not an array: computing results over the whole history threw a TypeError on this game. The list of
    // running games never looks at a finished game, so this user simply has no running game.
    const game = { ...template4, coop: false, gameEnded: true, teams: { first: [0, 2] }, winningTeams: [true, false] }
    await insertGame({ running: false, nPlayers: 4, nTeams: 2, game, seatOfUser: 0 }, MALFORMED_USER)
    const { pool, calls } = recordingPool()
    expect(await getRunningGamesOfUser(pool, MALFORMED_USER)).toStrictEqual([])
    expect(calls).toHaveLength(1)
  })
})
