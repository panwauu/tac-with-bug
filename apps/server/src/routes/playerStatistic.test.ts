import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets'

describe('Platform PlayerStatistic Test Suite', () => {
  let userWithCredentials: User

  beforeAll(async () => {
    userWithCredentials = await registerUserAndReturnCredentials()
  })

  afterAll(async () => {
    await unregisterUser(userWithCredentials)
  })

  test('Should return empty playerStats for new user', async () => {
    const response = await testAgent.get('/gameApi/profile/getPlayerStats/').query({ username: userWithCredentials.username })
    expect(response.status).toBe(200)
    expect(response.body.history).toEqual([])
    expect(response.body.table).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(response.body.subscriber).toEqual(false)
    expect(response.body.people).toEqual({})
    expect(response.body.hof).toEqual([])
    expect(response.body.userDescription).toEqual('')
    expect(response.body.gamesDistribution).toEqual({
      teamWon: 0,
      teamAborted: 0,
      won4: 0,
      lost4: 0,
      won6: 0,
      lost6: 0,
      aborted: 0,
      running: 0,
    })
  })

  test('Should return empty tournamentParticipations for new user', async () => {
    const response = await testAgent.get('/gameApi/profile/userTournamentParticipations/').query({ username: userWithCredentials.username })
    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  test('Should return playerStats of existing player', async () => {
    const response = await testAgent.get('/gameApi/profile/getPlayerStats/').query({ username: 'UserA' })
    expect(response.status).toBe(200)
    delete response.body.registered
    expect(response.body).toMatchSnapshot()
  })

  test('Counts all games, only games of humans or only games with bots', async () => {
    const get = (games?: string) => testAgent.get('/gameApi/profile/getPlayerStats/').query({ username: 'UserA', ...(games != null ? { games } : {}) })
    const all = await get()
    const humans = await get('humans')
    const bots = await get('bots')
    expect([all.status, humans.status, bots.status]).toEqual([200, 200, 200])

    // Every game is either a game of humans or a game with bots
    expect(humans.body.history.length + bots.body.history.length).toBe(all.body.history.length)
    expect(bots.body.history.length).toBeGreaterThan(0)
    expect((await get('all')).body).toEqual(all.body)

    // Bot accounts make a game a game with bots, too
    const humansBefore = humans.body.history.length
    await testServer.pgPool.query("UPDATE users SET bot_account = TRUE WHERE username = 'UserB';")
    try {
      expect((await get('humans')).body.history.length).toBeLessThan(humansBefore)
    } finally {
      await testServer.pgPool.query("UPDATE users SET bot_account = FALSE WHERE username = 'UserB';")
    }

    expect((await get('robots')).status).toBe(422)
  })

  test('Should return tournamentParticipations of existing player', async () => {
    const response = await testAgent.get('/gameApi/profile/userTournamentParticipations/').query({ username: 'UserA' })
    expect(response.status).toBe(200)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body).toMatchSnapshot()
  })

  test.todo('Test something more specific for Oskar stats')
})
