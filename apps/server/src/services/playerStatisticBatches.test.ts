import type pg from 'pg'
import { getGames } from './game'
import { addGameToPlayerStatistic, getPlayerStats, intializePlayerStatistic } from './playerStatistic'

// The profile statistics as computed until v1.6.4: all games of the user loaded at once, sorted by the last move.
async function previousPlayerStats(sqlClient: pg.Pool, userID: number) {
  const games = await getGames(sqlClient, userID)
  games.sort((a, b) => (a.lastPlayed > b.lastPlayed ? 1 : -1))
  const sum = intializePlayerStatistic()
  for (const game of games) {
    addGameToPlayerStatistic(sum, game, userID)
  }
  return sum
}

type StoredGame = Record<string, unknown> & { statistic: unknown[] }

// Users without games in populate_test.sql: the added games belong to EDGE_USER, the other seats to TABLE_MATES.
const EDGE_USER = 9
const TABLE_MATES = [10, 11, 12, 13, 14, 15]

async function insertGame(running: boolean, nPlayers: 4 | 6, nTeams: 2 | 3, game: StoredGame, seatOfUser: number, lastPlayed: string) {
  const res = await testServer.pgPool.query<{ id: number }>('INSERT INTO games (running, n_players, n_teams, game, lastplayed) VALUES ($1, $2, $3, $4, $5) RETURNING id;', [
    running,
    nPlayers,
    nTeams,
    JSON.stringify(game),
    lastPlayed,
  ])
  const mates = [...TABLE_MATES]
  for (let seat = 0; seat < nPlayers; seat++) {
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [
      seat === seatOfUser ? EDGE_USER : mates.shift(),
      res.rows[0].id,
      seat,
    ])
  }
  if (seatOfUser >= nPlayers) {
    // A substitute keeps a seat index beyond the players (its statistic was moved to that index)
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [EDGE_USER, res.rows[0].id, seatOfUser])
  }
}

describe('Profile statistics loaded in batches', () => {
  beforeAll(async () => {
    // Every test file has its own copy of populate_test.sql, so the games added here stay in this file.
    const template4 = (await testServer.pgPool.query<{ game: StoredGame }>('SELECT game FROM games WHERE n_players = 4 ORDER BY id LIMIT 1;')).rows[0].game
    const template6 = (await testServer.pgPool.query<{ game: StoredGame }>('SELECT game FROM games WHERE n_players = 6 ORDER BY id LIMIT 1;')).rows[0].game
    const teams4 = [
      [0, 2],
      [1, 3],
    ]
    const ended = (winningTeams: boolean[]) => ({ ...template4, coop: false, gameEnded: true, teams: teams4, winningTeams })
    const sameSecond = '2026-10-14 08:00:00.250+00'

    // Six games with the same time of the last move and different results: the history must keep their order
    await insertGame(false, 4, 2, ended([true, false]), 0, sameSecond)
    await insertGame(false, 4, 2, ended([true, false]), 1, sameSecond)
    await insertGame(false, 4, 2, { ...template4, coop: true, gameEnded: true, teams: teams4, winningTeams: [false, false] }, 2, sameSecond)
    await insertGame(false, 4, 2, { ...template4, coop: false, gameEnded: false, teams: teams4, winningTeams: [false, false] }, 3, sameSecond)
    await insertGame(true, 4, 2, { ...template4, coop: false, gameEnded: false, teams: teams4, winningTeams: [false, false] }, 0, sameSecond)
    await insertGame(false, 4, 2, ended([false, true]), 3, '2026-10-14 08:00:00.900+00')
    // Games whose last move is in the opposite order of their ids
    await insertGame(false, 4, 2, ended([false, true]), 0, '2026-10-14 09:00:03+00')
    await insertGame(false, 4, 2, ended([true, false]), 2, '2026-10-14 09:00:02+00')
    await insertGame(
      false,
      6,
      3,
      {
        ...template6,
        coop: false,
        gameEnded: true,
        teams: [
          [0, 3],
          [1, 4],
          [2, 5],
        ],
        winningTeams: [false, true, false],
      },
      4,
      '2026-10-14 09:00:01+00'
    )
    // A substitute in an ended game
    await insertGame(false, 4, 2, { ...ended([true, false]), statistic: [...template4.statistic, template4.statistic[0]] }, 4, '2026-10-14 07:00:00+00')
  })

  test.each([1, 2, 3, 5, 200])('equals the previous computation for every user (batch size %i)', async (batchSize) => {
    const users = await testServer.pgPool.query<{ id: number }>('SELECT id FROM users ORDER BY id;')
    expect(users.rows.length).toBeGreaterThan(10)
    for (const { id } of users.rows) {
      const stats = await getPlayerStats(testServer.pgPool, id, batchSize)
      const previous = await previousPlayerStats(testServer.pgPool, id)
      expect(stats).toStrictEqual(previous)
      expect(JSON.stringify(stats)).toBe(JSON.stringify(previous))
    }
  })

  test('keeps the order of the history by the last move', async () => {
    const stats = await getPlayerStats(testServer.pgPool, EDGE_USER, 2)
    expect(stats.wl.gamesHistory).toHaveLength(10)
    expect(stats.wl.gamesHistory[0]).toBe('a') // the substitute, 07:00
    expect(stats.wl.gamesHistory.slice(-3)).toEqual(['w', 'w', 'l']) // 09:00:01 (6 players, seat 4 in the winning team), 09:00:02, 09:00:03
  })
})
