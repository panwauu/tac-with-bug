import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets';

describe('Platform PlayerStatistic Test Suite', () => {
    let userWithCredentials: User;

    beforeAll(async () => {
        userWithCredentials = await registerUserAndReturnCredentials()
    })

    afterAll(async () => {
        await unregisterUser(userWithCredentials)
    })

    test('Should return empty playerStats for new user', async () => {
        const response = await testAgent.get('/gameApi/profile/getPlayerStats/')
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
        const response = await testAgent.get('/gameApi/profile/userNetwork/')
            .query({ username: userWithCredentials.username })
        expect(response.status).toBe(200)
        expect(response.body.graph.nodes.length).toEqual(1)
        expect(response.body.graph.nodes[0].data.name).toBe(userWithCredentials.username)
        expect(response.body.graph.edges).toEqual([])
        expect(response.body.people).toEqual({})
    })

    test('Should return empty tournamentParticipations for new user', async () => {
        const response = await testAgent.get('/gameApi/profile/userTournamentParticipations/')
            .query({ username: userWithCredentials.username })
        expect(response.status).toBe(200)
        expect(response.body).toEqual([])
    })

    test('Should return playerStats of existing player', async () => {
        const response = await testAgent.get('/gameApi/profile/getPlayerStats/')
            .query({ username: 'UserA' })
        expect(response.status).toBe(200)
        delete response.body.registered
        expect(response.body).toMatchSnapshot()
    })

    test('Should return userGraph of existing player', async () => {
        const response = await testAgent.get('/gameApi/profile/userNetwork/')
            .query({ username: 'UserA' })
        expect(response.status).toBe(200)
        expect(Object.keys(response.body.people).length).toBeGreaterThan(0)
        expect(response.body).toMatchSnapshot()
    })

    test('Should return tournamentParticipations of existing player', async () => {
        const response = await testAgent.get('/gameApi/profile/userTournamentParticipations/')
            .query({ username: 'UserA' })
        expect(response.status).toBe(200)
        expect(response.body.length).toBeGreaterThan(0)
        expect(response.body).toMatchSnapshot()
    })

    test.todo('Test something more specific for Oskar stats')
})
