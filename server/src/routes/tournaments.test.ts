import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets';

describe('Tournament API', () => {
    let userWithCredentials: User;

    beforeAll(async () => {
        userWithCredentials = await registerUserAndReturnCredentials()
    })

    beforeEach(async () => { await testServer.pgPool.query('UPDATE users SET admin=true WHERE id=$1;', [userWithCredentials.id]) })

    afterAll(async () => {
        await unregisterUser(userWithCredentials)
    })

    test('Create Tournament - fail if not admin', async () => {
        await testServer.pgPool.query('UPDATE users SET admin=false WHERE id=$1;', [userWithCredentials.id])
        const apiRes = await testAgent.post('/gameApi/createTournament')
            .set({ Authorization: userWithCredentials.authHeader })
            .send({
                title: 'TestTournament',
                begin: '2021-01-01 00:00:00+02',
                deadline: '2021-01-02 00:00:00+02',
                creationDates: ['2021-01-03 00:00:00+02'],
                secondsPerGame: 5400,
                nTeams: 2
            })
        expect(apiRes.statusCode).toBe(401)
    })

    test('Create Tournament - 2 Teams', async () => {
        const apiRes = await testAgent.post('/gameApi/createTournament')
            .set({ Authorization: userWithCredentials.authHeader })
            .send({
                title: 'TestTournament',
                begin: '2021-01-01 00:00:00+02',
                deadline: '2021-01-02 00:00:00+02',
                creationDates: ['2021-01-03 00:00:00+02'],
                secondsPerGame: 5400,
                nTeams: 2
            })
        expect(apiRes.statusCode).toBe(200)
        expect(apiRes.body.id).toBeGreaterThan(0);
        expect(apiRes.body.data.brackets.length).toBe(1);
        expect(apiRes.body.data.brackets[0].length).toBe(1);

        const dbResBefore = await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1 RETURNING *;', [apiRes.body.id])
        expect(apiRes.body.id).toBe(dbResBefore.rows[0].id);
    })

    test('Create Tournament - 8 Teams', async () => {
        const apiRes = await testAgent.post('/gameApi/createTournament')
            .set({ Authorization: userWithCredentials.authHeader })
            .send({
                title: 'TestTournament',
                begin: '2021-01-01 00:00:00+02',
                deadline: '2021-01-02 00:00:00+02',
                creationDates: ['2021-01-03 00:00:00+02', '2021-01-04 00:00:00+02', '2021-01-05 00:00:00+02'],
                secondsPerGame: 5400,
                nTeams: 8
            })
        expect(apiRes.statusCode).toBe(200)
        expect(apiRes.body.id).toBeGreaterThan(0);
        expect(apiRes.body.data.brackets.length).toBe(3);
        expect(apiRes.body.data.brackets[0].length).toBe(4);
        expect(apiRes.body.data.brackets[1].length).toBe(2);
        expect(apiRes.body.data.brackets[2].length).toBe(2);

        const dbResBefore = await testServer.pgPool.query('DELETE FROM tournaments WHERE id = $1 RETURNING *;', [apiRes.body.id])
        expect(apiRes.body.id).toBe(dbResBefore.rows[0].id);
    })

    test('Generate Team Name', async () => {
        const apiRes = await testAgent.get('/gameApi/generateTeamName')
            .query({ tournamentID: 1 })
            .set({ Authorization: userWithCredentials.authHeader })
        expect(apiRes.statusCode).toBe(200)
        expect(apiRes.text).toMatch(/[a-zA-Z]+ [a-zA-Z]+/);
    })

    test.todo('Test swap player')
    test.todo('Test change tournament size')
})
