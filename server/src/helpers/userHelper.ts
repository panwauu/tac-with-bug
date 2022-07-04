import type { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';
import Chance from 'chance';
const chance = new Chance();
import { io } from 'socket.io-client';
import { TacServer } from '../server';
import supertest from 'supertest';

export interface userWithCredentials {
    authHeader: string;
    token: string;
    id: number;
    username: string;
    email: string;
    password: string;
    locale: string;
}

export interface userWithCredentialsAndSocket extends userWithCredentials {
    socket: GeneralSocketC;
}

export async function registerUserAndReturnCredentials(testServer: TacServer, testAgent: supertest.SuperAgentTest): Promise<userWithCredentials> {
    const validBody = {
        'username': chance.string({ length: 12, pool: 'abcdABCD' }),
        'email': `${chance.string({ length: 12, pool: 'abcdABCD' })}@asdfasgdsafd.com`,
        'password': '12341234',
        'locale': 'de'
    }

    await testServer.pgPool.query('DELETE FROM users WHERE username = $1;', [validBody.username])

    const signUpRes = await testAgent.post('/gameApi/sign-up').send(validBody)
    if (signUpRes.status !== 201) { throw new Error(`Sign-up failed: ${signUpRes.status}; ${signUpRes.text}`) }

    const dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [validBody.username])
    const activationRes = await testAgent.get('/gameApi/activation').query({ userID: dbRes.rows[0].id, token: dbRes.rows[0].token })
    if (activationRes.status !== 200) { throw new Error(`Activation failed: ${activationRes.status}; ${activationRes.text}`) }

    const response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    if (response.status !== 200) { throw new Error(`Login failed: ${response.status}; ${response.text}`) }

    return {
        ...validBody,
        authHeader: `Bearer ${response.body.token}`,
        token: response.body.token,
        id: dbRes.rows[0].id,
    }
}

export async function unregisterUser(testAgent: supertest.SuperAgentTest, userWithCredentials: userWithCredentials) {
    const res = await testAgent.delete('/gameApi/deleteUser')
        .set({ Authorization: userWithCredentials.authHeader })
        .send()
    if (res.statusCode !== 204) { throw new Error('Could not delete user') }
}

export async function registerNUsersWithSockets(testServer: TacServer, testAgent: supertest.SuperAgentTest, n_connections: number): Promise<userWithCredentialsAndSocket[]> {
    const promiseArray: Promise<userWithCredentialsAndSocket>[] = []

    for (let i = 0; i < n_connections; i++) {
        promiseArray.push(
            new Promise<userWithCredentialsAndSocket>((resolve) => {
                registerUserAndReturnCredentials(testServer, testAgent).then((uWC: userWithCredentials) => {
                    const clientSocket = io('http://localhost:1234', { auth: { token: uWC.token } });
                    clientSocket.on('connect', () => {
                        const result: userWithCredentialsAndSocket = { ...uWC, socket: clientSocket }
                        resolve(result);
                    })
                })
            })
        )
    }

    const users = await Promise.all(promiseArray)
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000)) // TBD - Needed to add this to pass test consistently
    return users
}

export async function unregisterUsersWithSockets(testAgent: supertest.SuperAgentTest, userWithSocketArray: userWithCredentialsAndSocket[]) {
    for (let i = 0; i < userWithSocketArray.length; i++) {
        userWithSocketArray[i].socket?.close()
    }

    return Promise.all(userWithSocketArray.map((uWS) => {
        return new Promise<void>((resolve) => { unregisterUser(testAgent, uWS).then(() => resolve()) })
    }))
}
