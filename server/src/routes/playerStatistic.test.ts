import { TacServer } from '../server';
import supertest from 'supertest';
import { registerUserAndReturnCredentials, unregisterUser, userWithCredentials } from '../helpers/userHelper';

describe.skip('Platform PlayerStatistic Test Suite', () => {
    let agent: supertest.SuperAgentTest, server: TacServer, userWithCredentials: userWithCredentials;

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

    test('Should return empty playerStats for new user', async () => {
        const response = await agent.get('/gameApi/profile/getPlayerStats/')
            .query({ username: userWithCredentials.username })
        expect(response.status).toBe(200)
        expect(response.body.history).toEqual([])
        expect(response.body.players.mostFrequent).toEqual('')
        expect(response.body.players.bestPartner).toEqual('')
        expect(response.body.players.worstEnemy).toEqual('')
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
            running: 0
        })
    })

    test('Should return empty userGraph for new user', async () => {
        const response = await agent.get('/gameApi/profile/userNetwork/')
            .query({ username: userWithCredentials.username })
        expect(response.status).toBe(200)
        expect(response.body.graph.nodes.length).toEqual(1)
        expect(response.body.graph.nodes[0].data.name).toBe(userWithCredentials.username)
        expect(response.body.graph.edges).toEqual([])
        expect(response.body.people).toEqual({})
    })

    test('Should return empty tournamentParticipations for new user', async () => {
        const response = await agent.get('/gameApi/profile/userTournamentParticipations/')
            .query({ username: userWithCredentials.username })
        expect(response.status).toBe(200)
        expect(response.body).toEqual([])
    })

    test('Should return playerStats of Oskar', async () => {
        const response = await agent.get('/gameApi/profile/getPlayerStats/')
            .query({ username: 'Oskar' })
        expect(response.status).toBe(200)
    })

    test('Should return userGraph of Oskar', async () => {
        const response = await agent.get('/gameApi/profile/userNetwork/')
            .query({ username: 'Oskar' })
        expect(response.status).toBe(200)
    })

    test('Should return tournamentParticipations of Oskar', async () => {
        const response = await agent.get('/gameApi/profile/userTournamentParticipations/')
            .query({ username: 'Oskar' })
        expect(response.status).toBe(200)
        expect(response.body.length).toBeGreaterThan(0)
        expect(response.body[0].id).toBe(1)
        expect(response.body[0].title).toBe('March Madness Tournament')
        expect(response.body[0].date).toBe('2021-03-13T17:00:00.000Z')
        expect(response.body[0].team.name).toBe('Team Affenhaus')
        expect(response.body[0].team.players.sort()).toEqual(['Oskar', 'Sophia'])
        expect(response.body[0].team.playerids.sort()).toEqual([4, 7])
        expect(response.body[0].exitRound).toBe(4)
        expect(response.body[0].totalRounds).toBe(4)
        expect(response.body[0].placement).toBe(4)
    })

    test.todo('Test something more specific for Oskar stats')
})
