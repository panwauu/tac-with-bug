import { cloneDeep } from 'lodash';
import { TacServer } from '../server';
import supertest from 'supertest';
import * as mail from '../communicationUtils/email';
import Chance from 'chance';
const chance = new Chance();

describe('Sign-Up', () => {
    let server: TacServer, agent: supertest.SuperAgentTest;

    const validBody = {
        'username': chance.string({ length: 12, pool: 'abcdABCD' }),
        'email': `${chance.string({ length: 12, pool: 'abcdABCD' })}@asdfasgdsafd.com`,
        'password': '12341234',
        'locale': 'de'
    }
    const anotherValidBody = {
        'username': chance.string({ length: 12, pool: 'abcdABCD' }),
        'email': `${chance.string({ length: 12, pool: 'abcdABCD' })}@asdfasgdsafd.com`,
        'password': '12341234',
        'locale': 'de'
    }

    const spyNewPassword = jest.spyOn(mail, 'sendNewPassword');
    const spyActivation = jest.spyOn(mail, 'sendActivation');

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
        await server.pgPool.query('DELETE FROM users WHERE username = $1;', [validBody.username])
    })

    afterEach(() => { jest.clearAllMocks() })

    afterAll(async () => {
        await server.destroy()
    })

    test('Empty Request', async () => {
        const response = await agent.post('/gameApi/sign-up')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        const detailString = JSON.stringify(response.body.details)
        expect(detailString).toContain('\'username\' is required')
        expect(detailString).toContain('\'locale\' is required')
        expect(detailString).toContain('\'password\' is required')
        expect(detailString).toContain('\'email\' is required')
    })

    test('Illegal Usernames', async () => {
        const body = cloneDeep(validBody)

        body.username = 'a'
        let response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_TOO_SHORT')

        body.username = 'aaaaaaaaaaaaa'
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_TOO_LONG')

        body.username = 'aaaa#'
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_INVALID_LETTERS')
    })

    test('Illegal passwords', async () => {
        const body = cloneDeep(validBody)

        body.password = '1234567'
        let response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('PASSWORD_TOO_SHORT')

        body.password = chance.string({ pool: '1', length: 65 })
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('PASSWORD_TOO_LONG')
    })

    test('Illegal emails', async () => {
        const body = cloneDeep(validBody)

        body.email = 'test@test'
        let response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('EMAIL_INVALID')

        body.email = 'testtest.de'
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('EMAIL_INVALID')
    })

    test('Unavailable mail or username', async () => {
        const body = cloneDeep(validBody)

        body.email = 'rakbau@gmail.com'
        let response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('EMAIL_NOT_AVAILABLE')

        body.email = 'Rakbau@gmail.com'
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('EMAIL_NOT_AVAILABLE')

        body.username = 'Oskar'
        response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_NOT_AVAILABLE')
    })

    test('Valid sign-up', async () => {
        const body = cloneDeep(validBody)

        const response = await agent.post('/gameApi/sign-up').send(body)
        expect(response.statusCode).toBe(201)
        expect(response.body).toStrictEqual('Registered!')

        const dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [body.username])
        expect(dbRes.rowCount).toBe(1)
        expect(dbRes.rows[0].email).toBe(body.email)
        expect(dbRes.rows[0].password).not.toBe(body.password)
        expect(dbRes.rows[0].activated).toBe(false)
        expect(Date.now() - Date.parse(dbRes.rows[0].lastlogin)).toBeLessThan(10000)
        expect(Date.now() - Date.parse(dbRes.rows[0].registered)).toBeLessThan(10000)
        expect(dbRes.rows[0].freelicense).toBeFalsy()
        expect(dbRes.rows[0].currentsubscription).toBeNull()
        expect(dbRes.rows[0].profilepic).not.toBeUndefined()
        expect(dbRes.rows[0].profilepic).not.toBeNull()

        expect(spyActivation).toBeCalledTimes(1)
    })

    test('Login before activation', async () => {
        const response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(401)
        expect(response.body.message).toBe('Email not activated')
        expect(response.body.error).toBe('email')
    })

    test('New Activation Mail - Unactivated User', async () => {
        const response = await agent.post(`/gameApi/activation/${validBody.username}`)
        expect(response.statusCode).toBe(204)
        expect(spyActivation).toBeCalledTimes(1)
    })

    test('Activation of new user', async () => {
        const dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
        expect(dbRes.rowCount).toBe(1)
        const token = dbRes.rows[0].token
        const userID = dbRes.rows[0].id

        let response = await agent.get('/gameApi/activation').query({})
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'userID\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'token\' is required')

        response = await agent.get('/gameApi/activation').query({ userID: userID })
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).not.toContain('\'userID\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'token\' is required')

        response = await agent.get('/gameApi/activation').query({ userID: -1, token: '' })
        expect(response.statusCode).toBe(404)
        expect(response.body).toStrictEqual('Validation failed: userID not found')

        response = await agent.get('/gameApi/activation').query({ userID, token: '' })
        expect(response.statusCode).toBe(403)
        expect(response.body).toStrictEqual('Validation failed: wrong token')

        response = await agent.get('/gameApi/activation').query({ userID, token: token })
        expect(response.statusCode).toBe(200)
        expect(response.body).toStrictEqual('Validation of user successfull')
    })

    test('New Activation Mail - Activated User', async () => {
        let response = await agent.post(`/gameApi/activation/${validBody.username}`)
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('User is already activated')

        response = await agent.post('/gameApi/activation/a')
        expect(response.statusCode).toBe(404)
        expect(response.body).toStrictEqual('Username not found')
    })

    test('Login', async () => {
        let response = await agent.post('/gameApi/login')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'username\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'password\' is required')

        response = await agent.post('/gameApi/login').send({ username: 'a', password: 'a' })
        expect(response.statusCode).toBe(401)
        expect(response.body.message).toBe('Username is incorrect!')
        expect(response.body.error).toBe('user')

        response = await agent.post('/gameApi/login').send({ username: validBody.username, password: '' })
        expect(response.statusCode).toBe(401)
        expect(response.body.message).toBe('Password is incorrect!')
        expect(response.body.error).toBe('password')

        response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(200)
        expect(response.body.message).toBe('Logged in!')
        expect(response.body.token).not.toBeUndefined()
        expect(response.body.token).not.toBeNull()
        expect(response.body.locale).not.toBeUndefined()
        expect(response.body.locale).not.toBeNull()
    })

    test('changeMail', async () => {
        let response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(200)
        const authHeader = `Bearer ${response.body.token}`

        response = await agent.post('/gameApi/changeMail')
        expect(response.statusCode).toBe(401)

        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'email\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'password\' is required')

        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
            .send({ email: 'test', password: '1' })
        expect(response.statusCode).toBe(409)
        expect(response.body).toBe('EMAIL_INVALID')

        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
            .send({ email: validBody.email, password: '1' })
        expect(response.statusCode).toBe(409)
        expect(response.body).toBe('EMAIL_NOT_AVAILABLE')

        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
            .send({ email: anotherValidBody.email, password: '1' })
        expect(response.statusCode).toBe(401)
        expect(response.body.message).toBe('Password is incorrect!')

        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
            .send({ email: anotherValidBody.email, password: validBody.password })
        expect(response.statusCode).toBe(204)

        let dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
        expect(dbRes.rowCount).toBe(1)
        let token = dbRes.rows[0].token
        const userID = dbRes.rows[0].id

        expect(dbRes.rows[0].activated).toBe(false)
        expect(spyActivation).toHaveBeenCalledTimes(1)

        // Reset Email and Reactivate Account
        response = await agent.post('/gameApi/changeMail')
            .set({ Authorization: authHeader })
            .send({ email: validBody.email, password: validBody.password })
        expect(response.statusCode).toBe(204)

        dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
        expect(dbRes.rowCount).toBe(1)
        token = dbRes.rows[0].token

        response = await agent.get('/gameApi/activation').query({ userID, token: token })
        expect(response.statusCode).toBe(200)
    })

    test('changeUsername', async () => {
        let response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(200)
        const authHeader = `Bearer ${response.body.token}`

        response = await agent.post('/gameApi/changeUsername').send()
        expect(response.statusCode).toBe(401)

        response = await agent.post('/gameApi/changeUsername').send()
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'username\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'password\' is required')

        response = await agent.post('/gameApi/changeUsername').send({ username: 'aaaaaaaaaaaaa', password: '1' })
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_TOO_LONG')

        response = await agent.post('/gameApi/changeUsername').send({ username: 'aaaa#', password: '1' })
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_INVALID_LETTERS')

        response = await agent.post('/gameApi/changeUsername').send({ username: 'Oskar', password: '1' })
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(409)
        expect(response.body).toStrictEqual('USERNAME_NOT_AVAILABLE')

        response = await agent.post('/gameApi/changeUsername').send({ username: anotherValidBody.username, password: '1' })
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(401)
        expect(response.body).toStrictEqual({ message: 'Password is incorrect!' })

        response = await agent.post('/gameApi/changeUsername').send({
            username: anotherValidBody.username,
            password: validBody.password
        }).set({ Authorization: authHeader })
        expect(response.statusCode).toBe(204)

        response = await agent
            .get('/gameApi/isUsernameFree')
            .query({ username: anotherValidBody.username })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(false)

        response = await agent.post('/gameApi/changeUsername').send({
            username: validBody.username,
            password: validBody.password
        }).set({ Authorization: authHeader })
        expect(response.statusCode).toBe(204)
    })

    test('changePassword', async () => {
        let response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(200)
        const authHeader = `Bearer ${response.body.token}`

        response = await agent.post('/gameApi/changePassword')
        expect(response.statusCode).toBe(401)

        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'password\' is required')
        expect(JSON.stringify(response.body.details)).toContain('\'password_old\' is required')

        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
            .send({ password_old: 'a', password: anotherValidBody.password })
        expect(response.statusCode).toBe(401)
        expect(response.body.message).toBe('Password is incorrect!')

        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
            .send({ password_old: validBody.password, password: '1234567' })
        expect(response.statusCode).toBe(409)
        expect(response.body).toBe('PASSWORD_TOO_SHORT')

        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
            .send({ password_old: validBody.password, password: anotherValidBody.password })
        expect(response.statusCode).toBe(204)

        // Reset Password
        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
            .send({ password_old: anotherValidBody.password, password: validBody.password })
        expect(response.statusCode).toBe(204)
    })

    test('requestNewPassword', async () => {
        let response = await agent.post('/gameApi/requestNewPassword')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')

        response = await agent.post('/gameApi/requestNewPassword').send({ username: 'a' })
        expect(response.statusCode).toBe(400)
        expect(response.body).toBe('User not found')

        response = await agent.post('/gameApi/requestNewPassword').send({ email: 'a@sadjfkjs.de' })
        expect(response.statusCode).toBe(400)
        expect(response.body).toBe('User not found')
        expect(spyNewPassword).not.toHaveBeenCalled()

        response = await agent.post('/gameApi/requestNewPassword').send({ email: validBody.email })
        expect(spyNewPassword).toHaveBeenCalledTimes(1)
        const newPW = spyNewPassword.mock.calls[0][0].password

        response = await agent.post('/gameApi/login').send({ username: validBody.username, password: newPW })
        expect(response.statusCode).toBe(200)

        response = await agent.post('/gameApi/requestNewPassword').send({ email: validBody.email.toUpperCase() })
        expect(spyNewPassword).toHaveBeenCalledTimes(2)
        const newPW2 = spyNewPassword.mock.calls[1][0].password

        response = await agent.post('/gameApi/login').send({ username: validBody.username, password: newPW2 })
        expect(response.statusCode).toBe(200)
        const authHeader = `Bearer ${response.body.token}`

        // Reset Password
        response = await agent.post('/gameApi/changePassword')
            .set({ Authorization: authHeader })
            .send({ password_old: newPW2, password: validBody.password })
        expect(response.statusCode).toBe(204)
    })

    test('Change Profile Descripton', async () => {
        const loginRes = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(loginRes.statusCode).toBe(200)
        const authHeader = `Bearer ${loginRes.body.token}`

        const unAuthRes = await agent.post('/gameApi/editUserDescription')
        expect(unAuthRes.statusCode).toBe(401)

        const failRes = await agent.post('/gameApi/editUserDescription').set({ Authorization: authHeader })
        expect(failRes.statusCode).toBe(422)
        const failDbRes = await server.pgPool.query('SELECT user_description FROM users WHERE username=$1;', [validBody.username])
        expect(failDbRes.rows[0].user_description).toEqual('')

        const editRes = await agent.post('/gameApi/editUserDescription').set({ Authorization: authHeader }).send({ userDescription: 'testString' })
        expect(editRes.statusCode).toBe(204)
        const editDbRes = await server.pgPool.query('SELECT user_description FROM users WHERE username=$1;', [validBody.username])
        expect(editDbRes.rows[0].user_description).toEqual('testString')
    })

    test('Delete user', async () => {
        let response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
        expect(response.statusCode).toBe(200)
        const authHeader = `Bearer ${response.body.token}`

        const resForId = await server.pgPool.query('SELECT id FROM users WHERE username=$1;', [validBody.username])
        await server.pgPool.query('INSERT INTO hof (userid, status) VALUES ($1, \'spende\');', [resForId.rows[0].id])

        response = await agent.delete('/gameApi/deleteUser').set({ Authorization: authHeader })
        expect(response.statusCode).toBe(204)

        const dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1', [validBody.username])
        expect(dbRes.rowCount).toBe(0)
    })
})

describe('isUsernameFree', () => {
    let server: TacServer, agent: supertest.SuperAgentTest;

    beforeAll(async () => {
        server = new TacServer();
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
    })

    afterAll(async () => {
        await server.destroy()
    })

    test('Without provided username', async () => {
        const response = await agent.get('/gameApi/isUsernameFree')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'username\' is required')
    })

    test('With free username', async () => {
        const response = await agent
            .get('/gameApi/isUsernameFree')
            .query({ username: 'dasfdsfa1234' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(true)
    })

    test('With used username', async () => {
        const response = await agent
            .get('/gameApi/isUsernameFree')
            .query({ username: 'Oskar' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(false)
    })

    test('With used username and different Casing', async () => {
        const response = await agent
            .get('/gameApi/isUsernameFree')
            .query({ username: 'OSKAR' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(false)
    })
})

describe('isEmailFree', () => {
    let server: TacServer, agent: supertest.SuperAgentTest;

    beforeAll(async () => {
        server = new TacServer()
        agent = supertest.agent(server.httpServer)
        await server.listen(1234)
    })

    afterAll(async () => {
        await server.destroy()
    })

    test('Without provided email', async () => {
        const response = await agent
            .get('/gameApi/isEmailFree')
        expect(response.statusCode).toBe(422)
        expect(response.body.message).toStrictEqual('Validation Failed')
        expect(JSON.stringify(response.body.details)).toContain('\'email\' is required')
    })

    test('With free email', async () => {
        const response = await agent
            .get('/gameApi/isEmailFree')
            .query({ email: 'dfasdfasdfasdfsadf.mail.acc@gmail.com' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(true)
    })

    test('With used email', async () => {
        const response = await agent
            .get('/gameApi/isEmailFree')
            .query({ email: 'rakbau@gmail.com' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(false)
    })

    test('With used email and different Casing', async () => {
        const response = await agent
            .get('/gameApi/isEmailFree')
            .query({ email: 'RAKBAU@gmail.com' })
        expect(response.statusCode).toBe(200)
        expect(response.body).toBe(false)
    })
})