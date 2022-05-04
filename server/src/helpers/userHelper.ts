import type { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';
import Chance from 'chance';
const chance = new Chance();
import { io, Socket } from 'socket.io-client';
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

export async function registerUserAndReturnCredentials(server: TacServer, agent: supertest.SuperAgentTest): Promise<userWithCredentials> {
    const validBody = {
        'username': chance.string({ length: 12, pool: 'abcdABCD' }),
        'email': `${chance.string({ length: 12, pool: 'abcdABCD' })}@asdfasgdsafd.com`,
        'password': '12341234',
        'locale': 'de'
    }

    await server.pgPool.query('DELETE FROM users WHERE username = $1;', [validBody.username])

    const signUpRes = await agent.post('/gameApi/sign-up').send(validBody)
    if (signUpRes.status != 201) { throw new Error(`Sign-up failed: ${signUpRes.status}; ${signUpRes.text}`) }

    const dbRes = await server.pgPool.query('SELECT * FROM users WHERE username = $1;', [validBody.username])
    const activationRes = await agent.get('/gameApi/activation').query({ userID: dbRes.rows[0].id, token: dbRes.rows[0].token })
    if (activationRes.status != 200) { throw new Error(`Activation failed: ${activationRes.status}; ${activationRes.text}`) }

    const response = await agent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
    if (response.status != 200) { throw new Error(`Login failed: ${response.status}; ${response.text}`) }

    return {
        ...validBody,
        authHeader: `Bearer ${response.body.token}`,
        token: response.body.token,
        id: dbRes.rows[0].id,
    }
}

export async function unregisterUser(agent: supertest.SuperAgentTest, userWithCredentials: userWithCredentials) {
    const res = await agent.delete('/gameApi/deleteUser')
        .set({ Authorization: userWithCredentials.authHeader })
        .send()
    if (res.statusCode != 204) { throw new Error('Could not delete user') }
}

export async function registerNUsersWithSockets(server: TacServer, agent: supertest.SuperAgentTest, n_connections: number): Promise<userWithCredentialsAndSocket[]> {
    const promiseArray: Promise<userWithCredentialsAndSocket>[] = []

    for (let i = 0; i < n_connections; i++) {
        promiseArray.push(
            new Promise<userWithCredentialsAndSocket>((resolve) => {
                registerUserAndReturnCredentials(server, agent).then((uWC: userWithCredentials) => {
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

export async function unregisterUsersWithSockets(agent: supertest.SuperAgentTest, userWithSocketArray: userWithCredentialsAndSocket[]) {
    for (let i = 0; i < userWithSocketArray.length; i++) {
        userWithSocketArray[i].socket?.close()
    }

    return Promise.all(userWithSocketArray.map((uWS) => {
        return new Promise<void>((resolve) => { unregisterUser(agent, uWS).then(() => resolve()) })
    }))
}

export function initiateGameSocket(gameID: number | string, token: string) {
    return io('http://localhost:1234/game', { auth: { gameID: gameID, token: token } });
}

export async function waitForGameSocketConnection(gameSocket: Socket) {
    return new Promise<void>((resolve, reject) => {
        gameSocket.on('connect', () => { resolve() })
        gameSocket.on('connect_error', () => { gameSocket?.close(); reject() })
    });
}

export async function registerGameSocket(gameID: number | string, token: string) {
    const gameSocket = initiateGameSocket(gameID, token)
    await waitForGameSocketConnection(gameSocket)
    return gameSocket
}

export async function unregisterGameSocket(gameSocket: Socket) { gameSocket?.close() }