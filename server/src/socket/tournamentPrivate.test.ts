import { TacServer } from '../server';
import supertest from 'supertest';
import { registerNUsersWithSockets, unregisterUsersWithSockets, userWithCredentialsAndSocket } from '../helpers/userHelper';
import { privateTournament } from '../../../shared/types/typesTournament';

async function tournamentCleanUp(server: TacServer, tournamentID: number | undefined) {
    if (tournamentID == null) { return }
    await server.pgPool.query('UPDATE games SET private_tournament_id = NULL WHERE private_tournament_id = $1;', [tournamentID])
    await server.pgPool.query('DELETE FROM private_tournaments_register WHERE tournamentid = $1;', [tournamentID])
    await server.pgPool.query('DELETE FROM users_to_private_tournaments WHERE tournamentid = $1;', [tournamentID])
    await server.pgPool.query('DELETE FROM private_tournaments WHERE id = $1;', [tournamentID])
}

describe('Test Suite via Socket.io', () => {
    let agent: supertest.SuperAgentTest, server: TacServer;
    let tournamentID: number, gameID: number, usersWithSockets: userWithCredentialsAndSocket[];

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)

        usersWithSockets = await registerNUsersWithSockets(server, agent, 4);
    })

    afterAll(async () => {
        await tournamentCleanUp(server, tournamentID)
        await unregisterUsersWithSockets(agent, usersWithSockets)
        await server.destroy()
    })

    test('Should create Tournament', async () => {
        await new Promise<privateTournament>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:create', { title: 'TestTournament', nTeams: 2, playersPerTeam: 2, teamsPerMatch: 2, tournamentType: 'KO' }, (res) => {
                expect(res.data != null).toBe(true)
                if (res.data == null) { throw new Error('Empty Game') }
                tournamentID = res.data.id
                resolve(res.data)
            })
        })
    })

    test('Should add player 0 to first tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[0].username, teamTitle: 'TestTeam1' }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
        expect(res?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
        expect(res?.registerTeams[0].activated).toEqual([true])
    })

    test('Should not add player again', async () => {
        const res = await new Promise<any>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[0].username, teamTitle: 'TestTeam1' }, (res) => {
                resolve(res)
            })
        })

        expect(res.error != null).toBe(true)
    })

    test('Should add player 0 to first tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[1].username, teamTitle: 'TestTeam1' }, (socketRes) => {
                resolve(socketRes.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
        expect(res?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
        expect(res?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
    })

    test('Should not add player 2 to first tournament team', async () => {
        const res = await new Promise<any>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[2].username, teamTitle: 'TestTeam1' }, (res) => {
                resolve(res)
            })
        })

        expect(res?.error != null).toBe(true)
    })

    test('Should remove player 1 from first tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planRemovePlayer', { tournamentID, usernameToRemove: usersWithSockets[1].username }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
        expect(res?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
        expect(res?.registerTeams[0].activated).toEqual([true])
    })

    test('Should add player 1 to first tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[1].username, teamTitle: 'TestTeam1' }, (result) => {
                resolve(result.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
        expect(res?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
        expect(res?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
    })

    test('Should activate player 1', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[1].socket.emit('tournament:private:acceptParticipation', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
        expect(res?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
        expect(res?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
    })

    test('Should add player 2 to second tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[2].username, teamTitle: 'TestTeam2' }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(2)
        expect(res?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
        expect(res?.registerTeams.map((r) => r.playerids).flat().sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
        expect(res?.registerTeams.map((r) => r.players).flat().sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
        expect(res?.registerTeams.map((r) => r.activated).flat().sort()).toEqual([true, true, false].sort())
    })

    test('Should decline player 2', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[2].socket.emit('tournament:private:declineParticipation', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(1)
        expect(res?.registerTeams[0].name).toEqual('TestTeam1')
        expect(res?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
        expect(res?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
        expect(res?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
    })

    test('Should add player 2 to second tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[2].username, teamTitle: 'TestTeam2' }, (data) => {
                resolve(data.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(2)
        expect(res?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
        expect(res?.registerTeams.map((r) => r.playerids).flat().sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
        expect(res?.registerTeams.map((r) => r.players).flat().sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
        expect(res?.registerTeams.map((r) => r.activated).flat().sort()).toEqual([true, true, false].sort())
    })

    test('Should add player 3 to second tournament team', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:planAddPlayer', { tournamentID, usernameToAdd: usersWithSockets[3].username, teamTitle: 'TestTeam2' }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(2)
        expect(res?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
        expect(res?.registerTeams.map((r) => r.playerids).flat().sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
        expect(res?.registerTeams.map((r) => r.players).flat().sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
        expect(res?.registerTeams.map((r) => r.activated).flat().sort()).toEqual([true, true, false, false].sort())
    })

    test('Should activate player 2', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[2].socket.emit('tournament:private:acceptParticipation', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(2)
        expect(res?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
        expect(res?.registerTeams.map((r) => r.playerids).flat().sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
        expect(res?.registerTeams.map((r) => r.players).flat().sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
        expect(res?.registerTeams.map((r) => r.activated).flat().sort()).toEqual([true, true, true, false].sort())
    })

    test('Should not be able to start tournament', async () => {
        const res = await new Promise<any>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:start', { tournamentID }, (res) => {
                resolve(res)
            })
        })

        expect(res?.error != null).toBe(true)
    })

    test('Should activate player 3', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[3].socket.emit('tournament:private:acceptParticipation', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.teams).toEqual([])
        expect(res?.registerTeams.length).toEqual(2)
        expect(res?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
        expect(res?.registerTeams.map((r) => r.playerids).flat().sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
        expect(res?.registerTeams.map((r) => r.players).flat().sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
        expect(res?.registerTeams.map((r) => r.activated).flat().sort()).toEqual([true, true, true, true].sort())
    })

    test('Should be able to start tournament', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:start', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.status).toBe('running')
        expect(res?.registerTeams).toEqual([])
        expect(res?.teams.length).toEqual(2)
    })

    test('Should be able to start game', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:startGame', { tournamentID, tournamentRound: 0, roundGame: 0 }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.data.brackets[0][0].gameID).not.toBe(-1)
        gameID = res?.data.brackets[0][0].gameID ?? 0
        expect(res?.data.brackets[0][0].winner).toBe(-1)
    })

    test('Should abort the tournament', async () => {
        const res = await new Promise<privateTournament | undefined>((resolve) => {
            usersWithSockets[0].socket.emit('tournament:private:abort', { tournamentID }, (res) => {
                resolve(res.data)
            })
        })

        expect(res != null).toBe(true)
        expect(res?.status).toBe('aborted')
        expect(res?.data.brackets[0][0].gameID).toBe(-1)
        expect(res?.data.brackets[0][0].winner).toBe(-1)

        const gameRes = await server.pgPool.query('SELECT * FROM games WHERE id=$1;', [gameID]);
        expect(gameRes.rows[0].private_tournament_id).toBeNull()
    })
})