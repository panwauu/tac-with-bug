import { closeSockets } from 'src/test/handleSocket'
import { getUserWithSocket, registerUserAndReturnCredentials, unregisterUser, User, UserWithSocket } from '../test/handleUserSockets'

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
    let response = await testAgent
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
