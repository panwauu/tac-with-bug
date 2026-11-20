import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets'

describe('Tournament API', () => {
  let userWithCredentials: User

  beforeAll(async () => {
    userWithCredentials = await registerUserAndReturnCredentials()
  })

  beforeEach(async () => {
    await testServer.pgPool.query('UPDATE users SET admin=true WHERE id=$1;', [userWithCredentials.id])
  })

  afterAll(async () => {
    await unregisterUser(userWithCredentials)
  })

  test('Create Tournament - fail if not admin', async () => {
    await testServer.pgPool.query('UPDATE users SET admin=false WHERE id=$1;', [userWithCredentials.id])
    const apiRes = await testAgent
      .post('/gameApi/createTournament')
      .set({ Authorization: userWithCredentials.authHeader })
      .send({
        title: 'TestTournament',
        begin: '2021-01-01 00:00:00+02',
        deadline: '2021-01-02 00:00:00+02',
        creationDates: ['2021-01-03 00:00:00+02'],
        secondsPerGame: 5400,
        nTeams: 2,
      })
    expect(apiRes.statusCode).toBe(401)
  })

  test('Create Tournament - 2 Teams', async () => {
    const apiRes = await testAgent
      .post('/gameApi/createTournament')
      .set({ Authorization: userWithCredentials.authHeader })
      .send({
        title: 'TestTournament',
        begin: '2021-01-01 00:00:00+02',
        deadline: '2021-01-02 00:00:00+02',
        creationDates: ['2021-01-03 00:00:00+02'],
        secondsPerGame: 5400,
        nTeams: 2,
      })
    expect(apiRes.statusCode).toBe(200)
    expect(apiRes.body.id).toBeGreaterThan(0)
    expect(apiRes.body.data.brackets).toHaveLength(1)
    expect(apiRes.body.data.brackets[0]).toHaveLength(1)

    const dbResBefore = await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1 RETURNING *;', [apiRes.body.id])
    expect(apiRes.body.id).toBe(dbResBefore.rows[0].id)
  })

  test('Create Tournament - 8 Teams', async () => {
    const apiRes = await testAgent
      .post('/gameApi/createTournament')
      .set({ Authorization: userWithCredentials.authHeader })
      .send({
        title: 'TestTournament',
        begin: '2021-01-01 00:00:00+02',
        deadline: '2021-01-02 00:00:00+02',
        creationDates: ['2021-01-03 00:00:00+02', '2021-01-04 00:00:00+02', '2021-01-05 00:00:00+02'],
        secondsPerGame: 5400,
        nTeams: 8,
      })
    expect(apiRes.statusCode).toBe(200)
    expect(apiRes.body.id).toBeGreaterThan(0)
    expect(apiRes.body.data.brackets).toHaveLength(3)
    expect(apiRes.body.data.brackets[0]).toHaveLength(4)
    expect(apiRes.body.data.brackets[1]).toHaveLength(2)
    expect(apiRes.body.data.brackets[2]).toHaveLength(2)

    const dbResBefore = await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1 RETURNING *;', [apiRes.body.id])
    expect(apiRes.body.id).toBe(dbResBefore.rows[0].id)
  })

  describe('Create Tournament - validation', () => {
    const valid = {
      title: 'TestTournament',
      begin: '2021-01-01 00:00:00+02',
      deadline: '2021-01-02 00:00:00+02',
      creationDates: ['2021-01-03 00:00:00+02', '2021-01-04 00:00:00+02', '2021-01-05 00:00:00+02'],
      secondsPerGame: 5400,
      nTeams: 8,
    }

    test.each([
      ['minTeams above nTeams', { minTeams: 9 }, 'MIN_TEAMS_NOT_VALID'],
      ['minTeams of three', { minTeams: 3 }, 'MIN_TEAMS_NOT_VALID'],
      ['three teams', { nTeams: 3, creationDates: valid.creationDates.slice(0, 2) }, 'N_TEAMS_NOT_VALID_FOR_KO'],
      ['too many teams', { nTeams: 33 }, 'N_TEAMS_NOT_VALID_FOR_KO'],
      ['wrong number of rounds', { creationDates: valid.creationDates.slice(0, 2) }, 'KO_ROUNDS_AND_CREATIONDATES_NOT_SAME_LENGTH'],
      ['deadline before begin', { deadline: '2020-12-31 00:00:00+02' }, 'DATES_NOT_IN_ORDER'],
      ['rounds not in order', { creationDates: ['2021-01-03 00:00:00+02', '2021-01-05 00:00:00+02', '2021-01-04 00:00:00+02'] }, 'DATES_NOT_IN_ORDER'],
      ['rounds overlap', { creationDates: ['2021-01-03 00:00:00+02', '2021-01-03 01:00:00+02', '2021-01-05 00:00:00+02'] }, 'ROUNDS_OVERLAP'],
      ['invalid date', { begin: 'tomorrow' }, 'DATES_NOT_VALID'],
      ['empty title', { title: '  ' }, 'TITLE_NOT_VALID'],
    ])('Reject %s', async (_, change, message) => {
      const apiRes = await testAgent
        .post('/gameApi/createTournament')
        .set({ Authorization: userWithCredentials.authHeader })
        .send({ ...valid, ...change })
      expect(apiRes.statusCode).toBe(400)
      expect(apiRes.body.message).toBe(message)
    })

    test('Fluid size with 6 to 12 teams', async () => {
      const apiRes = await testAgent
        .post('/gameApi/createTournament')
        .set({ Authorization: userWithCredentials.authHeader })
        .send({ ...valid, nTeams: 12, minTeams: 6, creationDates: [...valid.creationDates, '2021-01-06 00:00:00+02'] })
      expect(apiRes.statusCode).toBe(200)
      expect(apiRes.body.nTeams).toBe(12)
      expect(apiRes.body.minTeams).toBe(6)
      expect(apiRes.body.data.brackets).toHaveLength(4)
      await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1;', [apiRes.body.id])
    })

    test('Fixed size has minTeams equal to nTeams', async () => {
      const apiRes = await testAgent.post('/gameApi/createTournament').set({ Authorization: userWithCredentials.authHeader }).send(valid)
      expect(apiRes.statusCode).toBe(200)
      expect(apiRes.body.minTeams).toBe(8)
      await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1;', [apiRes.body.id])
    })
  })

  test('Generate Team Name', async () => {
    const apiRes = await testAgent.get('/gameApi/generateTeamName').query({ tournamentID: 1 }).set({ Authorization: userWithCredentials.authHeader })
    expect(apiRes.statusCode).toBe(200)
    expect(apiRes.text).toMatch(/[a-zA-Z]{1,30} [a-zA-Z]{1,30}/)
  })

  test('Invalid exchange player in public tournament', async () => {
    const resFirstWrong = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserInvalid',
      usernameOfReplacement: 'UserI',
      tournamentID: 2,
    })
    expect(resFirstWrong.statusCode).toBe(500)

    const resSecondWrong = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserA',
      usernameOfReplacement: 'UserInvalid',
      tournamentID: 2,
    })
    expect(resSecondWrong.statusCode).toBe(500)

    const resSecondAlreadyIn = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserA',
      usernameOfReplacement: 'UserB',
      tournamentID: 2,
    })
    expect(resSecondAlreadyIn.statusCode).toBe(500)

    const resNonExistentID = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserA',
      usernameOfReplacement: 'UserI',
      tournamentID: 0,
    })
    expect(resNonExistentID.statusCode).toBe(500)

    const resWrongStatus = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserA',
      usernameOfReplacement: 'UserI',
      tournamentID: 1,
    })
    expect(resWrongStatus.statusCode).toBe(500)
  })

  test('Exchange player in public tournament', async () => {
    const teams_before = await testServer.pgPool.query('SELECT * FROM users_to_tournaments WHERE tournamentid = 2').then((res: any) => res.rows)
    const apiRes = await testAgent.post('/gameApi/exchangeUser').set({ Authorization: userWithCredentials.authHeader }).send({
      usernameToReplace: 'UserA',
      usernameOfReplacement: 'UserI',
      tournamentID: 2,
    })
    expect(apiRes.statusCode).toBe(204)
    const teams_after = await testServer.pgPool.query('SELECT * FROM users_to_tournaments WHERE tournamentid = 2').then((res: any) => res.rows)

    expect(teams_before.map((t: any) => t.userid).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(teams_after.map((t: any) => t.userid).sort()).toEqual([2, 3, 4, 5, 6, 7, 8, 9])
  })

  test('Test change tournament size', async () => {
    const apiRes = await testAgent
      .post('/gameApi/createTournament')
      .set({ Authorization: userWithCredentials.authHeader })
      .send({
        title: 'TestTournament',
        begin: '2021-01-01 00:00:00+02',
        deadline: '2021-01-02 00:00:00+02',
        creationDates: ['2021-01-03 00:00:00+02', '2021-01-04 00:00:00+02', '2021-01-05 00:00:00+02'],
        secondsPerGame: 5400,
        nTeams: 8,
      })
    expect(apiRes.statusCode).toBe(200)
    expect(apiRes.body.id).toBeGreaterThan(0)
    expect(apiRes.body.data.brackets).toHaveLength(3)

    const changeResFail = await testAgent.post('/gameApi/changeTournamentSignUpSize').set({ Authorization: userWithCredentials.authHeader }).send({
      nTeams: 3,
      tournamentID: apiRes.body.id,
    })
    expect(changeResFail.statusCode).toBe(500)

    const changeResTooLarge = await testAgent.post('/gameApi/changeTournamentSignUpSize').set({ Authorization: userWithCredentials.authHeader }).send({
      nTeams: 16,
      tournamentID: apiRes.body.id,
    })
    expect(changeResTooLarge.statusCode).toBe(500)

    const changeRes = await testAgent
      .post('/gameApi/changeTournamentSignUpSize')
      .set({ Authorization: userWithCredentials.authHeader })
      .send({
        nTeams: 16,
        tournamentID: apiRes.body.id,
        creationDates: ['2021-01-03 00:00:00+02', '2021-01-04 00:00:00+02', '2021-01-05 00:00:00+02', '2021-01-06 00:00:00+02'],
      })
    expect(changeRes.statusCode).toBe(200)
    expect(changeRes.body.id).toBe(apiRes.body.id)
    expect(changeRes.body.data.brackets).toHaveLength(4)

    const changeResSmaller = await testAgent.post('/gameApi/changeTournamentSignUpSize').set({ Authorization: userWithCredentials.authHeader }).send({
      nTeams: 4,
      tournamentID: apiRes.body.id,
    })
    expect(changeResSmaller.statusCode).toBe(200)
    expect(changeResSmaller.body.id).toBe(apiRes.body.id)
    expect(changeResSmaller.body.data.brackets).toHaveLength(2)
  })
})
