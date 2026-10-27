import { calculateBotStatistic } from '../services/platformStatistic'

// Finished games with bots, written straight into the database; the trigger fills game_results
async function insertGame(data: { bots: (number | null)[]; humans: [seat: number, userID: number][]; winningTeams: boolean[]; coop?: boolean; cards?: number }) {
  const game = {
    gameEnded: true,
    coop: data.coop ?? false,
    teams:
      data.coop === true
        ? [[0, 1, 2, 3]]
        : [
            [0, 2],
            [1, 3],
          ],
    winningTeams: data.winningTeams,
    statistic: [{ cards: { total: [data.cards ?? 0, 0, 0] } }],
  }
  const bots = [...data.bots, null, null]
  const res = await testServer.pgPool.query<{ id: number }>(
    "INSERT INTO games (running, n_players, n_teams, created, lastplayed, bots, game) VALUES (FALSE, 4, $1, NOW() - interval '1 day', NOW() - interval '1 day', $2, $3) RETURNING id;",
    [2, bots, game]
  )
  for (const [seat, userID] of data.humans) {
    await testServer.pgPool.query('INSERT INTO users_to_games (userid, gameid, player_index) VALUES ($1, $2, $3);', [userID, res.rows[0].id, seat])
  }
}

describe('Bot statistics', () => {
  beforeAll(async () => {
    // Futuro (3) twice against humans: once won, once lost together with Anna Pokerface (12)
    await insertGame({
      bots: [null, 3, null, 3],
      humans: [
        [0, 1],
        [2, 2],
      ],
      winningTeams: [false, true],
    })
    await insertGame({
      bots: [null, 3, null, 12],
      humans: [
        [0, 1],
        [2, 2],
      ],
      winningTeams: [true, false],
    })
    // Futuro and Anna on different teams: no game against humans only, for neither of them
    await insertGame({
      bots: [3, 12, null, null],
      humans: [
        [2, 1],
        [3, 3],
      ],
      winningTeams: [true, false],
    })
    // Coop with the coop AI (30)
    await insertGame({ bots: [null, 30, 30, 30], humans: [[0, 1]], winningTeams: [true], coop: true, cards: 150 })
    // The account of an external bot (UserP, without other games) against two humans
    await testServer.pgPool.query("UPDATE users SET bot_account = TRUE WHERE username = 'UserP';")
    await insertGame({
      bots: [null, null, null, null],
      humans: [
        [0, 1],
        [1, 16],
        [2, 2],
        [3, 5],
      ],
      winningTeams: [false, true],
    })
  })

  afterAll(async () => {
    await testServer.pgPool.query("UPDATE users SET bot_account = FALSE WHERE username = 'UserP';")
  })

  test('counts games, players and wins against humans only', async () => {
    const stats = await calculateBotStatistic(testServer.pgPool)
    const futuro = stats.find((s) => s.botID === 3)
    expect(futuro).toMatchObject({ games: 3, gamesLast30Days: 3, humans: 3, againstHumans: { games: 2, wins: 1 }, coop: { games: 0 } })

    const anna = stats.find((s) => s.botID === 12)
    expect(anna).toMatchObject({ games: 2, humans: 3, againstHumans: { games: 1, wins: 0 } })

    const koop = stats.find((s) => s.botID === 30)
    expect(koop).toMatchObject({ games: 1, humans: 1, againstHumans: { games: 0, wins: 0 }, coop: { games: 1, averageCards: 150 } })

    const account = stats.find((s) => s.username === 'UserP')
    expect(account).toMatchObject({ botID: null, games: 1, humans: 3, againstHumans: { games: 1, wins: 1 } })

    // The most played first
    expect(stats[0].botID).toBe(3)
  })

  test('is served under /gameApi/getBotStats', async () => {
    const response = await testAgent.get('/gameApi/getBotStats')
    expect(response.statusCode).toBe(200)
    expect(response.body.find((s: any) => s.botID === 3)?.games).toBe(3)
  })
})
