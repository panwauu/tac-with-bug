import type pg from 'pg'
import { queryLeaderboardByWins, queryLeaderboardCoop } from './leaders'

// The leaderboard queries until v1.6.4, copied unchanged: they read the stored JSON of every game in the time range.
async function previousLeaderboardByWins(sqlClient: pg.Pool, limit: number, offset: number, startDate: Date, endDate: Date) {
  const query = `
    SELECT users.username, t2.wins, t2.ngames, t2.full_count FROM (
        SELECT userid, SUM(t.win) as wins, SUM(t.ngames) as ngames, count(*) OVER() AS full_count FROM (
            SELECT
                userid,
                CASE
                  WHEN games.game->'teams'->0 @> to_jsonb(player_index) AND (games.game->'winningTeams'->0)::BOOLEAN THEN 1
                  WHEN games.game->'teams'->1 @> to_jsonb(player_index) AND (games.game->'winningTeams'->1)::BOOLEAN THEN 1
                  WHEN games.game->'teams'->2 @> to_jsonb(player_index) AND (games.game->'winningTeams'->2)::BOOLEAN THEN 1
                  ELSE 0
                END as win,
                1 as ngames
            FROM users_to_games LEFT JOIN games ON games.id = users_to_games.gameid
            WHERE games.running=FALSE AND (games.game->'gameEnded')::BOOLEAN=TRUE AND (games.game->'coop')::BOOLEAN=FALSE AND games.created >= $3 AND games.created <= $4
        ) as t GROUP BY userid ORDER BY wins DESC, userid LIMIT $1 OFFSET $2
    ) as t2 LEFT JOIN users ON users.id = t2.userid ORDER BY t2.wins DESC, t2.userid;`
  const dbRes = await sqlClient.query(query, [limit, offset, startDate, endDate])

  return {
    username: dbRes.rows.map((row: any) => row.username),
    wins: dbRes.rows.map((row: any) => row.wins),
    winshare: dbRes.rows.map((row: any) => ((Number.parseInt(row.wins) * 100) / Number.parseInt(row.ngames)).toFixed(2)),
    nPlayers: dbRes.rowCount === 0 ? 0 : dbRes.rows?.[0].full_count,
  }
}

async function previousLeaderboardCoop(sqlClient: pg.Pool, limit: number, offset: number, nPlayers: number, startDate: Date, endDate: Date) {
  const query = `
    SELECT games.id, max(games.cards) as cards, array_agg(users.username) as team, max(games.lastplayed) as lastplayed, max(games.full_count) as full_count FROM (
        SELECT
            id,
            lastplayed,
            count(*) OVER() AS full_count,
            CAST(
                (SELECT SUM(cards) FROM (SELECT CAST(jsonb_extract_path(value, 'cards', 'total', '0') AS INTEGER) as cards FROM jsonb_array_elements(game->'statistic')) as tcards
            ) as INTEGER) as cards
        FROM games
        WHERE CAST(game->>'coop' AS BOOLEAN) = true AND games.running=FALSE AND CAST(game->>'gameEnded' AS BOOLEAN) = true AND n_players = $3 AND created >= $4 AND created <= $5
        ORDER BY cards LIMIT $1 OFFSET $2
    ) as games
    LEFT JOIN users_to_games ON users_to_games.gameid = games.id
    LEFT JOIN users ON users_to_games.userid = users.id
    GROUP BY games.id ORDER BY cards, lastplayed;`
  const dbRes = await sqlClient.query(query, [limit, offset, nPlayers, startDate, endDate])

  return {
    nGames: dbRes.rowCount === 0 ? 0 : dbRes.rows?.[0].full_count,
    team: dbRes.rows.map((row: any) => row.team),
    count: dbRes.rows.map((row: any) => row.cards),
    lastplayed: dbRes.rows.map((row: any) => Date.parse(row.lastplayed)),
    // These games have no bots
    bots: dbRes.rows.map(() => false),
  }
}

type StoredGame = Record<string, unknown>
type GameRow = {
  running: boolean
  nPlayers: 4 | 6
  nTeams: 2 | 3
  created: string
  lastplayed: string
  game: StoredGame
  players: number[]
  replaced?: number
  bots?: (number | null)[]
}

async function insertGame(g: GameRow) {
  const res = await testServer.pgPool.query<{ id: number }>(
    'INSERT INTO games (running, n_players, n_teams, created, lastplayed, game, bots) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;',
    [g.running, g.nPlayers, g.nTeams, g.created, g.lastplayed, JSON.stringify(g.game), g.bots ?? [null, null, null, null, null, null]]
  )
  const gameID = res.rows[0].id
  for (const [seat, userID] of g.players.entries()) {
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [userID, gameID, seat])
  }
  if (g.replaced != null) {
    // A substitute took over: the replaced user keeps a seat index beyond the players
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [g.replaced, gameID, g.nPlayers])
  }
  return gameID
}

async function resultRow(gameID: number) {
  const res = await testServer.pgPool.query('SELECT coop, winning_seats, cards FROM game_results WHERE gameid = $1;', [gameID])
  return res.rows[0] as { coop: boolean | null; winning_seats: number[]; cards: number | null } | undefined
}

// The team names of the previous query come in no defined order
function sortedTeams<T extends { team: string[][] }>(board: T) {
  return { ...board, team: board.team.map((t) => [...t].sort()) }
}

// A fixed sequence of pseudo-random numbers, so that every run inserts the same games
function seededRandom(seed: number) {
  let state = seed
  return (n: number) => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state % n
  }
}

const TEAMS_4 = [
  [0, 2],
  [1, 3],
]
const TEAMS_6_THREE = [
  [0, 3],
  [1, 4],
  [2, 5],
]
const TEAMS_6_TWO = [
  [0, 2, 4],
  [1, 3, 5],
]

// kind 0-6: 4 players, 7-8: 6 players, 9-14: team game with 4, 15-16: team game with 6, 17 and 19: aborted, 18: running
function gameKind(kind: number, random: (n: number) => number) {
  const nPlayers: 4 | 6 = (kind >= 7 && kind < 9) || (kind >= 15 && kind < 17) ? 6 : 4
  const coop = kind >= 9 && kind < 17
  const nTeams: 2 | 3 = nPlayers === 6 && (coop || random(3) > 0) ? 3 : 2
  const teams = nPlayers === 4 ? TEAMS_4 : nTeams === 3 ? TEAMS_6_THREE : TEAMS_6_TWO
  return { nPlayers, coop, nTeams, teams, ended: kind < 17, running: kind === 18 }
}

// 240 games from 2020 to 2023 (40 of them in one week of March 2023) with all kinds of results, substitutes and some
// games stored without "coop" or "gameEnded". The team games have different results (at least 3 cards apart, so that
// rounding the fractions of every seventh game makes no tie), because the previous query orders equal results randomly.
function generateGames(template: StoredGame, users: number[]): GameRow[] {
  const random = seededRandom(20261014)
  const games: GameRow[] = []
  let coopCards = 300
  for (let i = 0; i < 240; i++) {
    const day = i < 200 ? random(4 * 365) : 1160 + random(7)
    const created = new Date(Date.UTC(2020, 0, 1) + day * 86400000 + random(86400) * 1000)
    const lastplayed = new Date(created.getTime() + (10 + random(50)) * 60000)
    const { nPlayers, coop, nTeams, teams, ended, running } = gameKind(random(20), random)
    const winner = coop || !ended ? -1 : random(nTeams)
    coopCards += 3 + random(3)
    const cards = Array.from({ length: nPlayers }, (_, seat) => (seat === 0 ? coopCards - 40 * (nPlayers - 1) : 40))
    if (coop && i % 7 === 0) {
      cards[0] -= 0.5
      cards[1] += 0.5
    }
    const game: StoredGame = {
      ...template,
      coop,
      gameEnded: ended,
      teams,
      winningTeams: Array.from({ length: nTeams }, (_, t) => t === winner),
      statistic: cards.map((c) => ({ cards: { total: [c, 0, 0] } })),
    }
    if (i % 31 === 0) delete game.coop
    if (i % 37 === 0) delete game.gameEnded
    const pool = [...users]
    const players = Array.from({ length: nPlayers + 1 }, () => pool.splice(random(pool.length), 1)[0])
    const replaced = !running && random(10) === 0 ? players.pop() : undefined
    if (replaced == null) players.pop()
    games.push({ running, nPlayers, nTeams, created: created.toISOString(), lastplayed: lastplayed.toISOString(), game, players, replaced })
  }
  // Games created exactly at the start or the end of a time range: both ends belong to the range
  const atBoundary = (created: string, coop: boolean, players: number[]): GameRow => ({
    running: false,
    nPlayers: 4,
    nTeams: 2,
    created,
    lastplayed: created,
    game: {
      ...template,
      coop,
      gameEnded: true,
      teams: TEAMS_4,
      winningTeams: [!coop, false],
      statistic: [111, 1, 1, 1].map((c) => ({ cards: { total: [c, 0, 0] } })),
    },
    players,
  })
  games.push(atBoundary('2020-12-31T23:59:59Z', false, [13, 14, 15, 16]))
  games.push(atBoundary('2021-01-01T00:00:00Z', false, [13, 15, 14, 16]))
  games.push(atBoundary('2022-12-31T23:59:59Z', true, [1, 2, 3, 4]))
  return games
}

describe('Leaderboards from game_results', () => {
  let template: StoredGame
  const users = Array.from({ length: 16 }, (_, i) => i + 1)
  const ranges: Array<[string, Date, Date]> = [
    ['all', new Date(0), new Date('2030-01-01T00:00:00Z')],
    ['2020', new Date('2020-01-01T00:00:00Z'), new Date('2020-12-31T23:59:59Z')],
    ['2021-22', new Date('2021-01-01T00:00:00Z'), new Date('2022-12-31T23:59:59Z')],
    ['one week', new Date('2023-03-06T00:00:00Z'), new Date('2023-03-12T23:59:59Z')],
  ]

  beforeAll(async () => {
    // Every test file has its own copy of populate_test.sql, so the games added here stay in this file.
    template = (await testServer.pgPool.query<{ game: StoredGame }>('SELECT game FROM games WHERE n_players = 4 ORDER BY id LIMIT 1;')).rows[0].game
    expect(template).toBeDefined()
    for (const game of generateGames(template, users)) {
      await insertGame(game)
    }
  })

  test('holds one row for every game the leaderboards count', async () => {
    const counted = await testServer.pgPool.query<{ id: number }>(`SELECT id FROM games WHERE NOT running AND game -> 'gameEnded' = 'true'::jsonb ORDER BY id;`)
    const results = await testServer.pgPool.query<{ gameid: number }>('SELECT gameid FROM game_results ORDER BY gameid;')
    expect(counted.rows.length).toBeGreaterThan(150)
    expect(results.rows.map((r) => r.gameid)).toEqual(counted.rows.map((r) => r.id))

    // The generated games cover every case the comparisons below rely on
    const coverage = (
      await testServer.pgPool.query<Record<string, string>>(
        `SELECT count(*) FILTER (WHERE r.coop = FALSE AND r.n_players = 4) AS classic4,
           count(*) FILTER (WHERE r.coop = FALSE AND g.n_teams = 3) AS classic6of3,
           count(*) FILTER (WHERE r.coop = FALSE AND r.n_players = 6 AND g.n_teams = 2) AS classic6of2,
           count(*) FILTER (WHERE r.coop AND r.n_players = 4) AS team4,
           count(*) FILTER (WHERE r.coop AND r.n_players = 6) AS team6,
           count(*) FILTER (WHERE r.coop IS NULL) AS withoutcoop,
           count(*) FILTER (WHERE r.coop AND jsonb_path_exists(g.game, '$.statistic[*].cards.total[0] ? (@ != @.floor())')) AS fractions,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM users_to_games u WHERE u.gameid = r.gameid AND u.player_index >= r.n_players)) AS substitutes
         FROM game_results r JOIN games g ON g.id = r.gameid;`
      )
    ).rows[0]
    for (const [kind, n] of Object.entries(coverage)) {
      expect(Number(n), kind).toBeGreaterThanOrEqual(2)
    }
  })

  test('the winner leaderboard is the same as before', async () => {
    let nonEmpty = 0
    for (const [, start, end] of ranges) {
      for (const [limit, offset] of [
        [100, 0],
        [5, 0],
        [5, 5],
        [3, 14],
        [10, 100],
      ]) {
        const now = await queryLeaderboardByWins(testServer.pgPool, limit, offset, start, end)
        const before = await previousLeaderboardByWins(testServer.pgPool, limit, offset, start, end)
        expect(now).toStrictEqual(before)
        if (now.username.length > 0) nonEmpty++
      }
    }
    expect(nonEmpty).toBeGreaterThan(10)
  })

  test('the team leaderboards are the same as before', async () => {
    let nonEmpty = 0
    for (const nPlayers of [4, 6]) {
      for (const [, start, end] of ranges) {
        for (const [limit, offset] of [
          [100, 0],
          [5, 0],
          [5, 5],
          [3, 7],
          [10, 100],
        ]) {
          const now = await queryLeaderboardCoop(testServer.pgPool, limit, offset, nPlayers, start, end)
          const before = await previousLeaderboardCoop(testServer.pgPool, limit, offset, nPlayers, start, end)
          expect(sortedTeams(now)).toStrictEqual(sortedTeams(before))
          if (now.count.length > 0) nonEmpty++
        }
      }
    }
    expect(nonEmpty).toBeGreaterThan(15)
  })

  test('orders equal cards by the last move, then by game id, and lists the names by seat', async () => {
    const at = (minute: number) => new Date(Date.UTC(2028, 5, 1, 12, minute)).toISOString()
    const coopGame: StoredGame = {
      ...template,
      coop: true,
      gameEnded: true,
      teams: TEAMS_4,
      winningTeams: [false, false],
      statistic: [150, 0, 0, 0].map((c) => ({ cards: { total: [c, 0, 0] } })),
    }
    // Same cards; inserted newest first and with different players, so that neither the order of insertion nor the
    // names give the expected order. Seats deliberately not in the order of the user ids.
    const games: Array<{ minute: number; players: number[] }> = [
      { minute: 30, players: [4, 3, 2, 1] },
      { minute: 20, players: [8, 6, 7, 5] },
      { minute: 20, players: [12, 10, 9, 11] },
      { minute: 10, players: [16, 13, 15, 14] },
    ]
    const ids: number[] = []
    for (const g of games) {
      ids.push(await insertGame({ running: false, nPlayers: 4, nTeams: 2, created: at(0), lastplayed: at(g.minute), game: coopGame, players: g.players }))
    }
    const names = (await testServer.pgPool.query<{ id: number; username: string }>('SELECT id, username FROM users;')).rows
    const nameOf = (id: number) => names.find((u) => u.id === id)?.username
    // Expected: last move 10, then the two with last move 20 by game id, then 30
    const sameMinute = ids[1] < ids[2] ? [1, 2] : [2, 1]
    const expected = [3, ...sameMinute, 0].map((i) => ({ minute: games[i].minute, team: games[i].players.map(nameOf) }))

    const start = new Date(Date.UTC(2028, 0, 1))
    const end = new Date(Date.UTC(2028, 11, 31))
    const all = await queryLeaderboardCoop(testServer.pgPool, 10, 0, 4, start, end)
    expect(all.lastplayed).toEqual(expected.map((e) => Date.parse(at(e.minute))))
    expect(all.team).toEqual(expected.map((e) => e.team))
    expect(all.count).toEqual([150, 150, 150, 150])
    expect(all.nGames).toBe('4')
    // Pages of one give the same order
    for (let offset = 0; offset < 4; offset++) {
      const page = await queryLeaderboardCoop(testServer.pgPool, 1, offset, 4, start, end)
      expect(page.team).toEqual([expected[offset].team])
    }
  })

  test('is not run by updates that leave the result unchanged, like the rematch job', async () => {
    const id = (await testServer.pgPool.query<{ gameid: number }>('SELECT gameid FROM game_results ORDER BY gameid LIMIT 1;')).rows[0].gameid
    await testServer.pgPool.query('DELETE FROM game_results WHERE gameid = $1;', [id])
    // Columns the result is not made of: the trigger does not run, the row stays away
    await testServer.pgPool.query('UPDATE games SET rematch_open = TRUE WHERE id = $1;', [id])
    await testServer.pgPool.query('UPDATE games SET rematch_open = FALSE, colors = colors WHERE id = $1;', [id])
    expect(await resultRow(id)).toBeUndefined()
    // A column it is made of: the row is written again
    await testServer.pgPool.query('UPDATE games SET lastplayed = lastplayed WHERE id = $1;', [id])
    expect(await resultRow(id)).toBeDefined()
  })

  test('follows the game: ended, back to running, aborted', async () => {
    const teams = [
      [0, 2],
      [1, 3],
    ]
    const id = await insertGame({
      running: true,
      nPlayers: 4,
      nTeams: 2,
      created: '2029-01-01T00:00:00Z',
      lastplayed: '2029-01-01T00:30:00Z',
      game: { ...template, coop: false, gameEnded: false, teams, winningTeams: [false, false] },
      players: [5, 6, 7, 8],
    })
    expect(await resultRow(id)).toBeUndefined()

    const ended = { ...template, coop: false, gameEnded: true, teams, winningTeams: [false, true] }
    await testServer.pgPool.query('UPDATE games SET running = FALSE, game = $2 WHERE id = $1;', [id, JSON.stringify(ended)])
    expect(await resultRow(id)).toEqual({ coop: false, winning_seats: [1, 3], cards: expect.any(Number) })

    await testServer.pgPool.query('UPDATE games SET running = TRUE WHERE id = $1;', [id])
    expect(await resultRow(id)).toBeUndefined()

    await testServer.pgPool.query('UPDATE games SET running = FALSE, game = $2 WHERE id = $1;', [id, JSON.stringify({ ...ended, gameEnded: false })])
    expect(await resultRow(id)).toBeUndefined()

    await testServer.pgPool.query('UPDATE games SET game = $2 WHERE id = $1;', [id, JSON.stringify(ended)])
    expect(await resultRow(id)).toEqual({ coop: false, winning_seats: [1, 3], cards: expect.any(Number) })

    await testServer.pgPool.query('DELETE FROM users_to_games WHERE gameid = $1;', [id])
    await testServer.pgPool.query('DELETE FROM games WHERE id = $1;', [id])
    expect(await resultRow(id)).toBeUndefined()
  })

  test('saves games with odd stored JSON and keeps them off the leaderboards', async () => {
    const odd: StoredGame[] = [
      {
        ...template,
        coop: 'yes',
        gameEnded: true,
        teams: [
          [0, 2],
          [1, 3],
        ],
        winningTeams: [true, false],
      },
      { ...template, coop: false, gameEnded: true, teams: { first: [0, 2] }, winningTeams: [true, false] },
      { ...template, coop: false, gameEnded: true, teams: [['a', 2.5, 1e30, -1, 2]], winningTeams: [true] },
      { ...template, coop: true, gameEnded: true, winningTeams: [false, false], statistic: { cards: 1 } },
      { ...template, coop: true, gameEnded: true, winningTeams: [false, false], statistic: [{ cards: { total: ['x'] } }, 5, { cards: { total: [1e20] } }] },
      {
        ...template,
        coop: false,
        gameEnded: true,
        teams: [
          [0, 2],
          [1, 3],
        ],
        winningTeams: [1, 'true'],
      },
    ]
    const expected = [
      { coop: null, winning_seats: [0, 2], cards: expect.anything() },
      { coop: false, winning_seats: [], cards: expect.anything() },
      { coop: false, winning_seats: [2], cards: expect.anything() },
      { coop: true, winning_seats: [], cards: null },
      { coop: true, winning_seats: [], cards: null },
      { coop: false, winning_seats: [], cards: expect.anything() },
    ]
    for (const [i, game] of odd.entries()) {
      const id = await insertGame({
        running: true,
        nPlayers: 4,
        nTeams: 2,
        created: '2029-06-01T00:00:00Z',
        lastplayed: '2029-06-01T00:30:00Z',
        game: { ...template, coop: false, gameEnded: false },
        players: [1, 2, 3, 4],
      })
      await testServer.pgPool.query('UPDATE games SET running = FALSE, game = $2 WHERE id = $1;', [id, JSON.stringify(game)])
      const row = await resultRow(id)
      expect(row).toEqual(expected[i])
    }
    const start = new Date('2029-06-01T00:00:00Z')
    const end = new Date('2029-06-02T00:00:00Z')
    const wins = await queryLeaderboardByWins(testServer.pgPool, 10, 0, start, end)
    // Three games without team play count: UserC won one of them (seat 2 in the third), the coop: 'yes' game counts nowhere
    expect(wins.username).toEqual(['UserC', 'UserA', 'UserB', 'UserD'])
    expect(wins.wins).toEqual(['1', '0', '0', '0'])
    expect(wins.winshare).toEqual(['33.33', '0.00', '0.00', '0.00'])
    expect(await queryLeaderboardCoop(testServer.pgPool, 10, 0, 4, start, end)).toEqual({
      nGames: '2',
      team: expect.any(Array),
      count: [null, null],
      lastplayed: expect.any(Array),
      bots: [false, false],
    })
  })

  test('keeps a game with a bot off the leaderboards, also after the bot was replaced', async () => {
    const teams = TEAMS_4
    const start = new Date('2029-08-01T00:00:00Z')
    const end = new Date('2029-08-02T00:00:00Z')
    const times = { created: '2029-08-01T00:00:00Z', lastplayed: '2029-08-01T00:30:00Z' }
    const competitive = { ...template, coop: false, gameEnded: true, teams, winningTeams: [true, false] }
    const coop = { ...template, coop: true, gameEnded: true, teams, winningTeams: [false, false], statistic: [10, 10, 10, 10].map((c) => ({ cards: { total: [c, 0, 0] } })) }

    // A bot on a seat, a bot that was replaced during the game (it keeps the index of its archived statistic,
    // see substitution.ts) and, as the control, the same games played by humans only
    const withBotOnSeat = [null, null, 3, null, null, null]
    const withReplacedBot = [null, null, null, null, 3, null]
    for (const bots of [withBotOnSeat, withReplacedBot, undefined]) {
      for (const game of [competitive, { ...coop, substitutedPlayerIndices: bots === withReplacedBot ? [2] : [] }]) {
        await insertGame({ running: false, nPlayers: 4, nTeams: 2, ...times, game, players: [1, 2, 3, 4], bots })
      }
    }

    // Only the two games without any bot count - one win for the seats 0 and 2 of the competitive game
    const wins = await queryLeaderboardByWins(testServer.pgPool, 10, 0, start, end)
    expect(wins.username).toEqual(['UserA', 'UserC', 'UserB', 'UserD'])
    expect(wins.wins).toEqual(['1', '1', '0', '0'])
    expect(wins.winshare).toEqual(['100.00', '100.00', '0.00', '0.00'])
    const coopBoard = await queryLeaderboardCoop(testServer.pgPool, 10, 0, 4, start, end)
    expect(coopBoard.nGames).toBe('1')
    expect(coopBoard.count).toEqual([40])

    // With bots all three games count, and the two with a bot are marked
    const winsWithBots = await queryLeaderboardByWins(testServer.pgPool, 10, 0, start, end, true)
    expect(winsWithBots.wins).toEqual(['3', '3', '0', '0'])
    const coopWithBots = await queryLeaderboardCoop(testServer.pgPool, 10, 0, 4, start, end, true)
    expect(coopWithBots.nGames).toBe('3')
    expect([...coopWithBots.bots].sort()).toEqual([false, true, true])
  })

  test('saves a game even if its result cannot be written', async () => {
    const id = await insertGame({
      running: true,
      nPlayers: 4,
      nTeams: 2,
      created: '2029-07-01T00:00:00Z',
      lastplayed: '2029-07-01T00:30:00Z',
      game: { ...template, coop: false, gameEnded: false },
      players: [1, 2, 3, 4],
    })
    await testServer.pgPool.query('ALTER TABLE game_results ADD CONSTRAINT probe_fails CHECK (n_players < 0) NOT VALID;')
    try {
      const ended = { ...template, coop: false, gameEnded: true }
      const res = await testServer.pgPool.query('UPDATE games SET running = FALSE, game = $2 WHERE id = $1;', [id, JSON.stringify(ended)])
      expect(res.rowCount).toBe(1)
      expect((await testServer.pgPool.query('SELECT running FROM games WHERE id = $1;', [id])).rows[0].running).toBe(false)
      expect(await resultRow(id)).toBeUndefined()
    } finally {
      await testServer.pgPool.query('ALTER TABLE game_results DROP CONSTRAINT probe_fails;')
    }
  })
})
