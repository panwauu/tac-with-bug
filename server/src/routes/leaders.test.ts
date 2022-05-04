import { TacServer } from '../server';
import supertest from 'supertest';
import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe('Leaders Test Suite', () => {
    let userWithCredentials: userWithCredentials, agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)

        userWithCredentials = await registerUserAndReturnCredentials(server, agent)
    })

    afterAll(async () => {
        await unregisterUser(agent, userWithCredentials)
        await server.destroy()
    })

    test('Test Winner Leaderboard Bad Inputs', async () => {
        let response = await agent.get('/gameApi/getWinnerLeaderboard/')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'limit\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'offset\' is required')

        response = await agent.get('/gameApi/getWinnerLeaderboard/')
            .query({ limit: 10.5, offset: 0 })
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('limit and offset as integer required')

        response = await agent.get('/gameApi/getWinnerLeaderboard/')
            .query({ offset: 10, limit: 10, startDate: 1, endDate: 0 })
        expect(response.statusCode).toBe(409)
    })

    test('Test Coop Leaderboard Bad Inputs', async () => {
        let response = await agent.get('/gameApi/getCoopLeaderboard/')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'limit\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'offset\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'nPlayers\' is required')

        response = await agent.get('/gameApi/getCoopLeaderboard/')
            .query({ limit: 10, offset: 10.5, nPlayers: 4 })
        expect(response.statusCode).toBe(409)

        response = await agent.get('/gameApi/getCoopLeaderboard/')
            .query({ limit: 10, offset: 10, nPlayers: 5 })
        expect(response.statusCode).toBe(409)

        response = await agent.get('/gameApi/getCoopLeaderboard/')
            .query({ offset: 10, limit: 10, nPlayers: 4, startDate: 1, endDate: 0 })
        expect(response.statusCode).toBe(409)
    })

    test('Test Winner Leaderboard', async () => {
        const response = await agent.get('/gameApi/getWinnerLeaderboard/')
            .query({
                offset: 0,
                limit: 100,
                startDate: 0,
                endDate: Date.parse('2021-01-22 22:00:00.000000+01')
            })
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
        expect(response.body.nPlayers).toBe('4')
        expect(response.body.username).toStrictEqual(['Sophia', 'Oskar', 'Bernhard', 'Moritz'])
        expect(response.body.wins).toStrictEqual(['2', '1', '1', '0'])
        expect(response.body.winshare).toStrictEqual(['100.00', '50.00', '50.00', '0.00'])
    })

    test('Test Coop-4 Leaderboard', async () => {
        const response = await agent.get('/gameApi/getCoopLeaderboard/')
            .query({
                offset: 0,
                limit: 100,
                nPlayers: 4,
                startDate: 0,
                endDate: Date.parse('2021-02-07 21:00:00.000000+01')
            })
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
        expect(response.body.nGames).toBe('1')
        expect(response.body.team.length).toBe(1)
        expect(response.body.team[0].sort()).toStrictEqual(['Sophia', 'Schorsch', 'Oskar', 'Meike'].sort())
        expect(response.body.count).toStrictEqual([169])
        expect(response.body.lastplayed).toStrictEqual([1612728913000])
    })

    test('Test Coop-6 Leaderboard', async () => {
        const response = await agent.get('/gameApi/getCoopLeaderboard/')
            .query({
                offset: 0,
                limit: 100,
                nPlayers: 6,
                startDate: 0,
                endDate: Date.parse('2021-02-11 23:59:00.000000+01')
            })
            .set({ Authorization: userWithCredentials.authHeader })
        expect(response.statusCode).toBe(200)
        expect(response.body.nGames).toBe('2')
        expect(response.body.team.length).toBe(2)
        expect(response.body.team[0].sort()).toStrictEqual(['Oskar', 'Bernhard', 'GeBa', 'Annette', 'Sophia', 'Moritz'].sort())
        expect(response.body.team[1].sort()).toStrictEqual(['Sophia', 'Schmutzi', 'Oskar', 'Marshmallow', 'BloodyMary', 'Liv'].sort())
        expect(response.body.count).toStrictEqual([245, 283])
        expect(response.body.lastplayed).toStrictEqual([1612643283000, 1613082956000])
    })
})