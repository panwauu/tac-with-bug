import { cloneDeep } from 'lodash'
import * as mail from '../communicationUtils/email'
import Chance from 'chance'
import { getUserWithSocket, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
const chance = new Chance()

describe('Sign-Up', () => {
  const validBody = {
    username: chance.string({ length: 12, pool: 'abcd' }),
    email: `${chance.string({ length: 12, pool: 'abcd' })}@asdfasgdsafd.com`,
    password: chance.string({ length: 12, pool: '1234' }),
    locale: 'de',
  }
  const anotherValidBody = {
    username: chance.string({ length: 12, pool: 'efgh' }),
    email: `${chance.string({ length: 12, pool: 'efgh' })}@asdfasgdsafd.com`,
    password: chance.string({ length: 12, pool: '5678' }),
    locale: 'de',
  }

  const spyNewPassword = vitest.spyOn(mail, 'sendPasswordReset')
  const spyActivation = vitest.spyOn(mail, 'sendActivation')

  let blockedUserWithCredetials: UserWithSocket

  beforeAll(async () => {
    blockedUserWithCredetials = await getUserWithSocket(15)
  })

  afterEach(() => {
    vitest.clearAllMocks()
  })

  afterAll(async () => {
    await closeSockets([blockedUserWithCredetials])
  })

  test('Empty Request', async () => {
    const response = await testAgent.post('/gameApi/sign-up').send({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    const detailString = JSON.stringify(response.body.details)
    expect(detailString).toContain("'username' is required")
    expect(detailString).toContain("'locale' is required")
    expect(detailString).toContain("'password' is required")
    expect(detailString).toContain("'email' is required")
  })

  test('Illegal Usernames', async () => {
    const body = cloneDeep(validBody)

    body.username = 'a'
    let response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_TOO_SHORT')

    body.username = 'aaaaaaaaaaaaa'
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_TOO_LONG')

    body.username = 'aaaa#'
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_INVALID_LETTERS')
  })

  test('Illegal passwords', async () => {
    const body = cloneDeep(validBody)

    body.password = chance.string({ length: 7, pool: '1234' })
    let response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('PASSWORD_TOO_SHORT')

    body.password = chance.string({ pool: '1', length: 65 })
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('PASSWORD_TOO_LONG')
  })

  test('Illegal emails', async () => {
    const body = cloneDeep(validBody)

    body.email = 'test@test'
    let response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('EMAIL_INVALID')

    body.email = 'testtest.de'
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('EMAIL_INVALID')
  })

  test('Unavailable mail or username', async () => {
    const body = cloneDeep(validBody)

    body.email = 'user.a@fake-mail.de'
    let response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('EMAIL_NOT_AVAILABLE')

    body.email = 'User.a@fake-mail.de'
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('EMAIL_NOT_AVAILABLE')

    body.username = 'UserA'
    response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_NOT_AVAILABLE')
  })

  test('Valid sign-up', async () => {
    const body = cloneDeep(validBody)

    const response = await testAgent.post('/gameApi/sign-up').send(body)
    expect(response.statusCode).toBe(201)
    expect(response.body).toStrictEqual('Registered!')

    const dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [body.username])
    expect(dbRes.rowCount).toBe(1)
    expect(dbRes.rows[0].email).toBe(body.email)
    expect(dbRes.rows[0].password).not.toBe(body.password)
    expect(dbRes.rows[0].activated).toBe(false)
    expect(Date.now() - Date.parse(dbRes.rows[0].lastlogin)).toBeLessThan(10000)
    expect(Date.now() - Date.parse(dbRes.rows[0].registered)).toBeLessThan(10000)
    expect(dbRes.rows[0].profilepic).not.toBeUndefined()
    expect(dbRes.rows[0].profilepic).not.toBeNull()

    expect(spyActivation).toBeCalledTimes(1)
  })

  test('Login before activation', async () => {
    const response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(401)
    expect(response.body.message).toBe('Email not activated')
    expect(response.body.error).toBe('email')
  })

  test('New Activation Mail - Unactivated User', async () => {
    const response = await testAgent.post(`/gameApi/activation/${validBody.username}`)
    expect(response.statusCode).toBe(204)
    expect(spyActivation).toBeCalledTimes(1)
  })

  test('Activation of new user', async () => {
    const dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
    expect(dbRes.rowCount).toBe(1)
    const token = dbRes.rows[0].token
    const userID = dbRes.rows[0].id

    let response = await testAgent.get('/gameApi/activation').query({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'userID' is required")
    expect(JSON.stringify(response.body.details)).toContain("'token' is required")

    response = await testAgent.get('/gameApi/activation').query({ userID: userID })
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).not.toContain("'userID' is required")
    expect(JSON.stringify(response.body.details)).toContain("'token' is required")

    response = await testAgent.get('/gameApi/activation').query({ userID: -1, token: '' })
    expect(response.statusCode).toBe(404)
    expect(response.body).toStrictEqual('Validation failed: userID not found')

    response = await testAgent.get('/gameApi/activation').query({ userID, token: '' })
    expect(response.statusCode).toBe(403)
    expect(response.body).toStrictEqual('Validation failed: wrong token')

    response = await testAgent.get('/gameApi/activation').query({ userID, token: token })
    expect(response.statusCode).toBe(200)
    expect(response.body).toStrictEqual('Validation of user successfull')
  })

  test('New Activation Mail - Activated User', async () => {
    let response = await testAgent.post(`/gameApi/activation/${validBody.username}`)
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('User is already activated')

    response = await testAgent.post('/gameApi/activation/a')
    expect(response.statusCode).toBe(404)
    expect(response.body).toStrictEqual('Username not found')
  })

  test('Login', async () => {
    let response = await testAgent.post('/gameApi/login').send({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'username' is required")
    expect(JSON.stringify(response.body.details)).toContain("'password' is required")

    response = await testAgent.post('/gameApi/login').send({ username: 'a', password: 'a' })
    expect(response.statusCode).toBe(401)
    expect(response.body.message).toBe('Username is incorrect!')
    expect(response.body.error).toBe('user')

    response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: '' })
    expect(response.statusCode).toBe(401)
    expect(response.body.message).toBe('Password is incorrect!')
    expect(response.body.error).toBe('password')

    response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    expect(response.body.message).toBe('Logged in!')
    expect(response.body.token).not.toBeUndefined()
    expect(response.body.token).not.toBeNull()
    expect(response.body.locale).not.toBeUndefined()
    expect(response.body.locale).not.toBeNull()
  })

  test('changeMail', async () => {
    let response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const authHeader = `Bearer ${response.body.token}`

    response = await testAgent.post('/gameApi/changeMail')
    expect(response.statusCode).toBe(401)

    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'email' is required")
    expect(JSON.stringify(response.body.details)).toContain("'password' is required")

    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({ email: 'test', password: '1' })
    expect(response.statusCode).toBe(409)
    expect(response.body).toBe('EMAIL_INVALID')

    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({ email: validBody.email, password: '1' })
    expect(response.statusCode).toBe(409)
    expect(response.body).toBe('EMAIL_NOT_AVAILABLE')

    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({ email: anotherValidBody.email, password: '1' })
    expect(response.statusCode).toBe(401)
    expect(response.body.message).toBe('Password is incorrect!')

    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({ email: anotherValidBody.email, password: validBody.password })
    expect(response.statusCode).toBe(204)

    let dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
    expect(dbRes.rowCount).toBe(1)
    const userID = dbRes.rows[0].id

    expect(dbRes.rows[0].activated).toBe(false)
    expect(spyActivation).toHaveBeenCalledTimes(1)

    // Reset Email and Reactivate Account
    response = await testAgent.post('/gameApi/changeMail').set({ Authorization: authHeader }).send({ email: validBody.email, password: validBody.password })
    expect(response.statusCode).toBe(204)

    dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
    expect(dbRes.rowCount).toBe(1)
    const token = dbRes.rows[0].token

    response = await testAgent.get('/gameApi/activation').query({ userID, token: token })
    expect(response.statusCode).toBe(200)
  })

  test('changeUsername', async () => {
    let response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const authHeader = `Bearer ${response.body.token}`

    response = await testAgent.post('/gameApi/changeUsername').send()
    expect(response.statusCode).toBe(401)

    response = await testAgent.post('/gameApi/changeUsername').set({ Authorization: authHeader }).send({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'username' is required")
    expect(JSON.stringify(response.body.details)).toContain("'password' is required")

    response = await testAgent.post('/gameApi/changeUsername').send({ username: 'aaaaaaaaaaaaa', password: '1' }).set({ Authorization: authHeader })
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_TOO_LONG')

    response = await testAgent.post('/gameApi/changeUsername').send({ username: 'aaaa#', password: '1' }).set({ Authorization: authHeader })
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_INVALID_LETTERS')

    response = await testAgent.post('/gameApi/changeUsername').send({ username: 'UserA', password: '1' }).set({ Authorization: authHeader })
    expect(response.statusCode).toBe(409)
    expect(response.body).toStrictEqual('USERNAME_NOT_AVAILABLE')

    response = await testAgent.post('/gameApi/changeUsername').send({ username: anotherValidBody.username, password: '1' }).set({ Authorization: authHeader })
    expect(response.statusCode).toBe(401)
    expect(response.body).toStrictEqual({ message: 'Password is incorrect!' })

    response = await testAgent
      .post('/gameApi/changeUsername')
      .send({
        username: anotherValidBody.username,
        password: validBody.password,
      })
      .set({ Authorization: authHeader })
    expect(response.statusCode).toBe(204)

    response = await testAgent.get('/gameApi/isUsernameFree').query({ username: anotherValidBody.username })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(false)

    response = await testAgent
      .post('/gameApi/changeUsername')
      .send({
        username: validBody.username,
        password: validBody.password,
      })
      .set({ Authorization: authHeader })
    expect(response.statusCode).toBe(204)
  })

  test('changePassword', async () => {
    let response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const authHeader = `Bearer ${response.body.token}`

    response = await testAgent.post('/gameApi/changePassword')
    expect(response.statusCode).toBe(401)

    response = await testAgent.post('/gameApi/changePassword').set({ Authorization: authHeader }).send({})
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'password' is required")
    expect(JSON.stringify(response.body.details)).toContain("'password_old' is required")

    response = await testAgent.post('/gameApi/changePassword').set({ Authorization: authHeader }).send({ password_old: 'a', password: anotherValidBody.password })
    expect(response.statusCode).toBe(401)
    expect(response.body.message).toBe('Password is incorrect!')

    response = await testAgent.post('/gameApi/changePassword').set({ Authorization: authHeader }).send({ password_old: validBody.password, password: '1234567' })
    expect(response.statusCode).toBe(409)
    expect(response.body).toBe('PASSWORD_TOO_SHORT')

    response = await testAgent.post('/gameApi/changePassword').set({ Authorization: authHeader }).send({ password_old: validBody.password, password: anotherValidBody.password })
    expect(response.statusCode).toBe(204)

    // Reset Password
    response = await testAgent.post('/gameApi/changePassword').set({ Authorization: authHeader }).send({ password_old: anotherValidBody.password, password: validBody.password })
    expect(response.statusCode).toBe(204)
  })

  test('requestPasswordReset should fail for invalid users', async () => {
    spyNewPassword.mockReset()

    const responseFailedValidation = await testAgent.post('/gameApi/requestPasswordReset')
    expect(responseFailedValidation.statusCode).toBe(422)
    expect(responseFailedValidation.body.message).toStrictEqual('Validation Failed')

    const responseWrongUser = await testAgent.post('/gameApi/requestPasswordReset').send({ username: 'a' })
    expect(responseWrongUser.statusCode).toBe(400)
    expect(responseWrongUser.body).toBe('User not found')

    const responseWrongEmail = await testAgent.post('/gameApi/requestPasswordReset').send({ email: 'a@sadjfkjs.de' })
    expect(responseWrongEmail.statusCode).toBe(400)
    expect(responseWrongEmail.body).toBe('User not found')
    expect(spyNewPassword).not.toHaveBeenCalled()
  })

  async function requestPasswordResetHelper(req: { username: string } | { email: string }) {
    spyNewPassword.mockReset()

    const resetRes = await testAgent.post('/gameApi/requestPasswordReset').send(req)
    expect(resetRes.status).toBe(204)
    expect(spyNewPassword).toHaveBeenCalledOnce()
    const token = spyNewPassword.mock.calls[0][0].token
    expect(token).toHaveLength(64)
    return token
  }

  test('Request for a password reset should work with email and should be disabled when loggin in with old password afterwards', async () => {
    const token = await requestPasswordResetHelper({ username: validBody.username })
    const validBeforeLogin = await testServer.pgPool.query<{ valid: boolean }>('SELECT valid FROM password_reset_requests WHERE token=$1;', [token])
    expect(validBeforeLogin.rows[0].valid).toBe(true)

    const response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const validAfterLogin = await testServer.pgPool.query<{ valid: boolean }>('SELECT valid FROM password_reset_requests WHERE token=$1;', [token])
    expect(validAfterLogin.rows[0].valid).toBe(false)
  })

  test('Request for new password should work with username and should be disabled when loggin in with old password', async () => {
    const token = await requestPasswordResetHelper({ email: validBody.email })
    const validBeforeLogin = await testServer.pgPool.query<{ valid: boolean }>('SELECT valid FROM password_reset_requests WHERE token=$1;', [token])
    expect(validBeforeLogin.rows[0].valid).toBe(true)

    const response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const validAfterLogin = await testServer.pgPool.query<{ valid: boolean }>('SELECT valid FROM password_reset_requests WHERE token=$1;', [token])
    expect(validAfterLogin.rows[0].valid).toBe(false)
  })

  test('Request for new password should fail for noncompliant password', async () => {
    const response = await testAgent.post('/gameApi/applyPasswordReset').send({ token: 'a', password: 'a' })
    expect(response.statusCode).toBe(409)
  })

  test('Request for new password should fail for invalid token', async () => {
    const response = await testAgent.post('/gameApi/applyPasswordReset').send({ token: 'a', password: '12341234' })
    expect(response.statusCode).toBe(500)
  })

  test('Should be able to change the password after a request and disable all other requests', async () => {
    const token1 = await requestPasswordResetHelper({ username: validBody.username })
    const token2 = await requestPasswordResetHelper({ username: validBody.username })
    const newPassword = chance.string({ length: 12, pool: '1234' })

    const response = await testAgent.post('/gameApi/applyPasswordReset').send({ token: token1, password: newPassword })
    expect(response.status).toBe(204)

    validBody.password = newPassword
    const responseLogin = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(responseLogin.statusCode).toBe(200)

    const responseWithInvalid1 = await testAgent.post('/gameApi/applyPasswordReset').send({ token: token1, password: newPassword })
    expect(responseWithInvalid1.status).toBe(500)
    const responseWithInvalid2 = await testAgent.post('/gameApi/applyPasswordReset').send({ token: token2, password: newPassword })
    expect(responseWithInvalid2.status).toBe(500)
  })

  test('Should not be able to change the password with old request', async () => {
    const token = await requestPasswordResetHelper({ username: validBody.username })
    await testServer.pgPool.query<{ valid: boolean }>(`UPDATE password_reset_requests SET time_of_request = current_timestamp - interval '16 minutes' WHERE token=$1;`, [token])

    const response = await testAgent.post('/gameApi/applyPasswordReset').send({ token: token, password: validBody.password })
    expect(response.status).toBe(500)
  })

  test('Should not change Profile Description if blockedbymoderation', async () => {
    const editRes = await testAgent.post('/gameApi/editUserDescription').set({ Authorization: blockedUserWithCredetials.authHeader }).send({ userDescription: 'testString' })
    expect(editRes.statusCode).toBe(500)
  })

  test('Change Profile Description', async () => {
    const loginRes = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(loginRes.statusCode).toBe(200)
    const authHeader = `Bearer ${loginRes.body.token}`

    const unAuthRes = await testAgent.post('/gameApi/editUserDescription')
    expect(unAuthRes.statusCode).toBe(401)

    const failRes = await testAgent.post('/gameApi/editUserDescription').set({ Authorization: authHeader })
    expect(failRes.statusCode).toBe(422)
    const failDbRes = await testServer.pgPool.query('SELECT user_description FROM users WHERE username=$1;', [validBody.username])
    expect(failDbRes.rows[0].user_description).toEqual('')

    const editRes = await testAgent.post('/gameApi/editUserDescription').set({ Authorization: authHeader }).send({ userDescription: 'testString' })
    expect(editRes.statusCode).toBe(204)
    const editDbRes = await testServer.pgPool.query('SELECT user_description FROM users WHERE username=$1;', [validBody.username])
    expect(editDbRes.rows[0].user_description).toEqual('testString')
  })

  test('Delete user', async () => {
    await requestPasswordResetHelper({ username: validBody.username })

    let response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    expect(response.statusCode).toBe(200)
    const authHeader = `Bearer ${response.body.token}`

    const resForId = await testServer.pgPool.query('SELECT id FROM users WHERE username=$1;', [validBody.username])
    await testServer.pgPool.query("INSERT INTO hof (userid, status) VALUES ($1, 'spende');", [resForId.rows[0].id])

    response = await testAgent.delete('/gameApi/deleteUser').set({ Authorization: authHeader })
    expect(response.statusCode).toBe(204)

    const dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
    expect(dbRes.rowCount).toBe(0)
  })
})

describe('isUsernameFree', () => {
  test('Without provided username', async () => {
    const response = await testAgent.get('/gameApi/isUsernameFree')
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'username' is required")
  })

  test('With free username', async () => {
    const response = await testAgent.get('/gameApi/isUsernameFree').query({ username: 'dasfdsfa1234' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(true)
  })

  test('With used username', async () => {
    const response = await testAgent.get('/gameApi/isUsernameFree').query({ username: 'UserA' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(false)
  })

  test('With used username and different Casing', async () => {
    const response = await testAgent.get('/gameApi/isUsernameFree').query({ username: 'USERA' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(false)
  })
})

describe('isEmailFree', () => {
  test('Without provided email', async () => {
    const response = await testAgent.get('/gameApi/isEmailFree')
    expect(response.statusCode).toBe(422)
    expect(response.body.message).toStrictEqual('Validation Failed')
    expect(JSON.stringify(response.body.details)).toContain("'email' is required")
  })

  test('With free email', async () => {
    const response = await testAgent.get('/gameApi/isEmailFree').query({ email: 'dfasdfasdfasdfsadf.mail.acc@gmail.com' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(true)
  })

  test('With used email', async () => {
    const response = await testAgent.get('/gameApi/isEmailFree').query({ email: 'user.a@fake-mail.de' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(false)
  })

  test('With used email and different Casing', async () => {
    const response = await testAgent.get('/gameApi/isEmailFree').query({ email: 'USER.a@fake-mail.de' })
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(false)
  })
})
