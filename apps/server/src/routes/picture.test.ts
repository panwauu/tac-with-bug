import { closeSockets } from '../test/handleSocket'
import { getUsersWithSockets, getUserWithSocket, registerUserAndReturnCredentials, unregisterUser, User, UserWithSocket } from '../test/handleUserSockets'

async function getPicture(username: string) {
  const dbResBefore = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [username])
  return dbResBefore.rows[0].profilepic
}

describe('Profile Picture', () => {
  let userWithCredentials: User
  let blockedUserWithCredetials: UserWithSocket

  beforeAll(async () => {
    userWithCredentials = await registerUserAndReturnCredentials()
    blockedUserWithCredetials = await getUserWithSocket(15)
  })

  afterAll(async () => {
    await unregisterUser(userWithCredentials)
    await closeSockets([blockedUserWithCredetials])
  })

  test('Change profile picture', async () => {
    const picBefore = await getPicture(userWithCredentials.username)

    let response = await testAgent.delete('/gameApi/deleteProfilePicture')
    expect(response.statusCode).toBe(401)

    response = await testAgent.delete('/gameApi/deleteProfilePicture').set({ Authorization: userWithCredentials.authHeader })
    expect(response.statusCode).toBe(204)

    const picAfter = await getPicture(userWithCredentials.username)
    expect(picBefore).not.toEqual(picAfter)
  })

  test('Should not upload image if blockedbymoderation', async () => {
    const response = await testAgent
      .post('/gameApi/uploadProfilePicture')
      .set({ Authorization: blockedUserWithCredetials.authHeader })
      .attach('profilePic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(500)
  })

  test('Upload profile picture', async () => {
    const picBefore = await getPicture(userWithCredentials.username)

    let response = await testAgent.post('/gameApi/uploadProfilePicture').attach('profilePic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(401)

    response = await testAgent
      .post('/gameApi/uploadProfilePicture')
      .set({ Authorization: userWithCredentials.authHeader })
      .attach('profilePic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(204)

    const picAfter = await getPicture(userWithCredentials.username)
    expect(picBefore).not.toEqual(picAfter)
  })

  test('Get profile picture', async () => {
    let response = await testAgent.get('/gameApi/getProfilePicture')
    expect(response.statusCode).toBe(401)

    response = await testAgent.get('/gameApi/getProfilePicture').set({ Authorization: userWithCredentials.authHeader })
    expect(response.statusCode).toBe(200)
  })
})

describe('Group picture', () => {
  let usersWithSockets: UserWithSocket[]
  let groupChatID: number
  let privateChatID: number

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ ids: [1, 2, 3] })
    const group = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id], title: 'Bildgruppe' })
    groupChatID = group.data?.chatid ?? -1
    const single = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[2].id], title: null })
    privateChatID = single.data?.chatid ?? -1
  })

  afterAll(async () => {
    await usersWithSockets[0].socket.emitWithAck(5000, 'chat:leaveChat', { chatid: groupChatID })
    await usersWithSockets[1].socket.emitWithAck(5000, 'chat:leaveChat', { chatid: groupChatID })
    await closeSockets(usersWithSockets)
  })

  test('Members can upload, see and remove the picture', async () => {
    let response = await testAgent.post(`/gameApi/uploadGroupPicture?chatid=${groupChatID}`).attach('groupPic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(401)

    const overviewUpdate = usersWithSockets[1].socket.oncePromise('chat:overview:update')
    response = await testAgent
      .post(`/gameApi/uploadGroupPicture?chatid=${groupChatID}`)
      .set({ Authorization: usersWithSockets[0].authHeader })
      .attach('groupPic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(204)
    const overview = await overviewUpdate
    expect(typeof overview.find((c) => c.chatid === groupChatID)?.groupPicture).toBe('number')

    response = await testAgent.get(`/gameApi/getGroupPicture?chatid=${groupChatID}`).set({ Authorization: usersWithSockets[1].authHeader })
    expect(response.statusCode).toBe(200)
    expect(response.text).toContain('data:image/jpeg;base64,')

    response = await testAgent.delete(`/gameApi/deleteGroupPicture?chatid=${groupChatID}`).set({ Authorization: usersWithSockets[1].authHeader })
    expect(response.statusCode).toBe(204)
    response = await testAgent.get(`/gameApi/getGroupPicture?chatid=${groupChatID}`).set({ Authorization: usersWithSockets[1].authHeader })
    expect(response.statusCode).toBe(400)
  })

  test('Non-members and private chats get no picture', async () => {
    let response = await testAgent
      .post(`/gameApi/uploadGroupPicture?chatid=${groupChatID}`)
      .set({ Authorization: usersWithSockets[2].authHeader })
      .attach('groupPic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(400)

    response = await testAgent.get(`/gameApi/getGroupPicture?chatid=${groupChatID}`).set({ Authorization: usersWithSockets[2].authHeader })
    expect(response.statusCode).toBe(400)

    response = await testAgent
      .post(`/gameApi/uploadGroupPicture?chatid=${privateChatID}`)
      .set({ Authorization: usersWithSockets[0].authHeader })
      .attach('groupPic', './src/routes/picture.test.image.jpg')
    expect(response.statusCode).toBe(400)
  })
})
