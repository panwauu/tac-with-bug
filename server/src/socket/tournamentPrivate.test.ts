import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import { GeneralSocketC } from '../test/socket'

describe('Private tournament test suite via Socket.io', () => {
  let tournamentID: number, gameID: number, usersWithSockets: UserWithSocket[], unauthSocket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 5 })
    unauthSocket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, unauthSocket])
  })

  test('Should not create tournament with invalid data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:create', {
      nTeams: 2,
      playersPerTeam: 2,
      teamsPerMatch: 2,
      tournamentType: 'KO',
    } as any)
    expect(res.status).toBe(500)
  })

  test('Should create tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:create', {
      title: 'TestTournament',
      nTeams: 2,
      playersPerTeam: 2,
      teamsPerMatch: 2,
      tournamentType: 'KO',
    })
    expect(res.data).not.toBeNull()
    if (res.data == null) {
      throw new Error('Empty Game')
    }
    tournamentID = res.data.id
  })

  test('Should not add player to tournament with invalid data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    } as any)
    expect(res.status).toBe(500)
  })

  test('Should not add player to tournament with invalid tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID: 1000000,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.status).toBe(500)
  })

  test('Should not add player to tournament if not admin', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.status).toBe(500)
  })

  test('Should not add invalid player to tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: 'a',
      teamTitle: 'TestTeam1',
    })
    expect(res.status).toBe(500)
  })

  test('Should add player 0 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.status).toBe(200)
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
    expect(res.data?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
    expect(res.data?.registerTeams[0].activated).toEqual([true])
  })

  test('Should not add player again', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[0].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.error).not.toBeNull()
  })

  test('Should add player 1 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[1].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
  })

  test('Should not add player 2 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.error).not.toBeNull()
  })

  test('Should not remove player 1 with missing data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { usernameToRemove: usersWithSockets[1].username } as any)
    expect(res.status).toBe(500)
  })

  test('Should not remove player 1 with invalid tournament id', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { tournamentID: 1000000, usernameToRemove: usersWithSockets[1].username })
    expect(res.status).toBe(500)
  })

  test('Should not remove player 1 if not admin', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { tournamentID, usernameToRemove: usersWithSockets[1].username })
    expect(res.status).toBe(500)
  })

  test('Should not remove player with invalid username', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { tournamentID, usernameToRemove: 'a' })
    expect(res.status).toBe(500)
  })

  test('Should remove player 1 from first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planRemovePlayer', { tournamentID, usernameToRemove: usersWithSockets[1].username })
    expect(res.status).toBe(200)
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids).toEqual([usersWithSockets[0].id])
    expect(res.data?.registerTeams[0].players).toEqual([usersWithSockets[0].username])
    expect(res.data?.registerTeams[0].activated).toEqual([true])
  })

  test('Should add player 1 to first tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[1].username,
      teamTitle: 'TestTeam1',
    })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, false].sort())
  })

  test('Should activate player 1', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
  })

  test('Should not activate player 1 with missing data', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', {} as any)
    expect(res.status).toBe(500)
  })

  test('Should activate player 1 with invalid tournament id', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID: 1000000 })
    expect(res.status).toBe(500)
  })

  test('Should activate player 1', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
  })

  test('Should add player 2 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false].sort())
  })

  test('Should not decline player 2 with invalid data', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:declineParticipation', {} as any)
    expect(res.status).toBe(500)
  })

  test('Should not decline player 2 with invalid tournament id', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:declineParticipation', { tournamentID: 1000000 })
    expect(res.status).toBe(500)
  })

  test('Should decline player 2', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:declineParticipation', { tournamentID })
    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(1)
    expect(res.data?.registerTeams[0].name).toEqual('TestTeam1')
    expect(res.data?.registerTeams[0].playerids.sort()).toEqual([usersWithSockets[0].id, usersWithSockets[1].id].sort())
    expect(res.data?.registerTeams[0].players.sort()).toEqual([usersWithSockets[0].username, usersWithSockets[1].username].sort())
    expect(res.data?.registerTeams[0].activated.sort()).toEqual([true, true].sort())
  })

  test('Should add player 2 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[2].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false].sort())
  })

  test('Should add player 3 to second tournament team', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:planAddPlayer', {
      tournamentID,
      usernameToAdd: usersWithSockets[3].username,
      teamTitle: 'TestTeam2',
    })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, false, false].sort())
  })

  test('Should activate player 2', async () => {
    const res = await usersWithSockets[2].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, true, false].sort())
  })

  test('Should not be able to start tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID })
    expect(res.status).toBe(500)
  })

  test('Should activate player 3', async () => {
    const res = await usersWithSockets[3].socket.emitWithAck(5000, 'tournament:private:acceptParticipation', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.teams).toEqual([])
    expect(res.data?.registerTeams.length).toEqual(2)
    expect(res.data?.registerTeams.map((r) => r.name).sort()).toEqual(['TestTeam1', 'TestTeam2'].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.playerids)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].id, usersWithSockets[1].id, usersWithSockets[2].id, usersWithSockets[3].id].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.players)
        .flat()
        .sort()
    ).toEqual([usersWithSockets[0].username, usersWithSockets[1].username, usersWithSockets[2].username, usersWithSockets[3].username].sort())
    expect(
      res.data?.registerTeams
        .map((r) => r.activated)
        .flat()
        .sort()
    ).toEqual([true, true, true, true].sort())
  })

  test('Should not be able to start tournament with missing data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', {} as any)
    expect(res.status).toBe(500)
  })

  test('Should not be able to start tournament with invalid data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID: 1000000 })
    expect(res.status).toBe(500)
  })

  test('Should not be able to start tournament if not admin', async () => {
    const res = await usersWithSockets[1].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID })
    expect(res.status).toBe(500)
  })

  test('Should be able to start tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:start', { tournamentID })

    expect(res.data).not.toBeNull()
    expect(res.data?.status).toBe('running')
    expect(res.data?.registerTeams).toEqual([])
    expect(res.data?.teams.length).toEqual(2)
  })

  test('Should not be able to start game with missing data', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentRound: 0, roundGame: 0 } as any)
    expect(res.status).toBe(500)
  })

  test('Should not be able to start game with invalid tournament id', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID: 1000000, tournamentRound: 0, roundGame: 0 })
    expect(res.status).toBe(500)
  })

  test('Should not be able to start game if not admin', async () => {
    const res = await usersWithSockets[4].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID, tournamentRound: 0, roundGame: 0 })
    expect(res.status).toBe(500)
  })

  test('Should not be able to start game for invalid round', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID, tournamentRound: 1, roundGame: 1 })
    expect(res.status).toBe(500)
  })

  test('Should be able to start game', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID, tournamentRound: 0, roundGame: 0 })
    expect(res.data).not.toBeNull()
    expect(res.data?.data.brackets[0][0].gameID).not.toBe(-1)
    gameID = res.data?.data.brackets[0][0].gameID ?? 0
    expect(res.data?.data.brackets[0][0].winner).toBe(-1)
  })

  test('Should not be able to start running game', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:startGame', { tournamentID, tournamentRound: 0, roundGame: 0 })
    expect(res.status).toBe(500)
  })

  test('Should abort the tournament', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:abort', { tournamentID })
    expect(res.status).toBe(200)
    expect(res.data?.status).toBe('aborted')
    expect(res.data?.data.brackets[0][0].gameID).toBe(-1)
    expect(res.data?.data.brackets[0][0].winner).toBe(-1)

    const gameRes = await testServer.pgPool.query('SELECT * FROM games WHERE id=$1;', [gameID])
    expect(gameRes.rows[0].private_tournament_id).toBeNull()
  })

  test('Should not be able to request game without id', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:get', {} as any)
    expect(res.status).toBe(500)
  })

  test('Should not be able to request game with invalid id', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:get', { id: 1000000 })
    expect(res.status).toBe(500)
  })

  test('Should be able to request game', async () => {
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'tournament:private:get', { id: tournamentID })
    expect(res.status).toBe(200)
    expect(res.data?.id).toBe(tournamentID)
  })

  test.each([
    'tournament:private:create',
    'tournament:private:planAddPlayer',
    'tournament:private:planRemovePlayer',
    'tournament:private:acceptParticipation',
    'tournament:private:declineParticipation',
    'tournament:private:start',
    'tournament:private:abort',
    'tournament:private:startGame',
  ])('should not allow %s', async (eventname: any) => {
    const res = (await unauthSocket.emitWithAck(5000, eventname, 0)) as any
    expect(res.error).toBe('UNAUTH')
  })
})
