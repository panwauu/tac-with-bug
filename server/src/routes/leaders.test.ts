import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets'

describe('Leaders Test Suite', () => {
  let userWithCredentials: User

  beforeAll(async () => {
    userWithCredentials = await registerUserAndReturnCredentials()
  })

  afterAll(async () => {
    await unregisterUser(userWithCredentials)
  })

  test('Test Winner Leaderboard Bad Inputs', async () => {
    let response = await testAgent.get('/gameApi/getWinnerLeaderboard/')
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'limit' is required")
    expect(JSON.stringify(response.body.details)).toContain("'offset' is required")

    response = await testAgent.get('/gameApi/getWinnerLeaderboard/').query({ limit: 10.5, offset: 0 })
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('limit and offset as integer required')

    response = await testAgent.get('/gameApi/getWinnerLeaderboard/').query({ offset: 10, limit: 10, startDate: 1, endDate: 0 })
    expect(response.statusCode).toBe(409)
  })

  test('Test Coop Leaderboard Bad Inputs', async () => {
    let response = await testAgent.get('/gameApi/getCoopLeaderboard/')
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'limit' is required")
    expect(JSON.stringify(response.body.details)).toContain("'offset' is required")
    expect(JSON.stringify(response.body.details)).toContain("'nPlayers' is required")

    response = await testAgent.get('/gameApi/getCoopLeaderboard/').query({ limit: 10, offset: 10.5, nPlayers: 4 })
    expect(response.statusCode).toBe(409)

    response = await testAgent.get('/gameApi/getCoopLeaderboard/').query({ limit: 10, offset: 10, nPlayers: 5 })
    expect(response.statusCode).toBe(409)

    response = await testAgent.get('/gameApi/getCoopLeaderboard/').query({ offset: 10, limit: 10, nPlayers: 4, startDate: 1, endDate: 0 })
    expect(response.statusCode).toBe(409)
  })

  test('Test Winner Leaderboard', async () => {
    const response = await testAgent
      .get('/gameApi/getWinnerLeaderboard/')
      .query({
        offset: 0,
        limit: 100,
        startDate: 0,
        endDate: Date.parse('2020-01-01 22:00:00.000000+01'),
      })
      .set({ Authorization: userWithCredentials.authHeader })
    expect(response.statusCode).toBe(200)
    expect(response.body.nPlayers).toBe('4')
    expect(response.body.username).toStrictEqual(['UserA', 'UserC', 'UserB', 'UserD'])
    expect(response.body.wins).toStrictEqual(['1', '1', '0', '0'])
    expect(response.body.winshare).toStrictEqual(['100.00', '100.00', '0.00', '0.00'])
  })

  test('Test Coop-4 Leaderboard', async () => {
    const response = await testAgent
      .get('/gameApi/getCoopLeaderboard/')
      .query({
        offset: 0,
        limit: 100,
        nPlayers: 4,
        startDate: 0,
        endDate: Date.parse('2020-01-01 22:00:00.000000+01'),
      })
      .set({ Authorization: userWithCredentials.authHeader })
    expect(response.statusCode).toBe(200)
    expect(response.body.nGames).toBe('1')
    expect(response.body.team.length).toBe(1)
    expect(response.body.team[0].sort()).toStrictEqual(['UserA', 'UserB', 'UserC', 'UserD'].sort())
    expect(response.body.count).toStrictEqual([130])
  })

  test('Test Coop-6 Leaderboard', async () => {
    const response = await testAgent
      .get('/gameApi/getCoopLeaderboard/')
      .query({
        offset: 0,
        limit: 100,
        nPlayers: 6,
        startDate: 0,
        endDate: Date.parse('2020-01-01 22:00:00.000000+01'),
      })
      .set({ Authorization: userWithCredentials.authHeader })
    expect(response.statusCode).toBe(200)
    expect(response.body.nGames).toBe('1')
    expect(response.body.team.length).toBe(1)
    expect(response.body.team[0].sort()).toStrictEqual(['UserA', 'UserB', 'UserC', 'UserD', 'UserE', 'UserF'].sort())
    expect(response.body.count).toStrictEqual([192])
  })
})
