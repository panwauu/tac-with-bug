import type { GeneralSocketC } from '../../../shared/types/GeneralNamespaceDefinition';
import { io } from 'socket.io-client';

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

export async function getUser(id: number): Promise<userWithCredentials> {
    const userResponse = await testServer.pgPool.query<{ id: number, username: string, email: string, locale: string }>('SELECT id, username, email, locale FROM users WHERE id = $1;', [id])
    if (userResponse.rows.length != 1) { throw new Error('Could not query user') }

    const loginResponse = await testAgent.post('/gameApi/login').send({ username: userResponse.rows[0].username, password: 'password' })
    if (loginResponse.status !== 200) { throw new Error(`Login failed: ${loginResponse.status}; ${loginResponse.text}`) }

    return {
        authHeader: `Bearer ${loginResponse.body.token}`,
        token: loginResponse.body.token,
        password: 'password',
        id: userResponse.rows[0].id,
        username: userResponse.rows[0].username,
        email: userResponse.rows[0].email,
        locale: userResponse.rows[0].locale,
    }
}

export async function getUserWithSocket(id: number): Promise<userWithCredentialsAndSocket> {
    const user = await getUser(id);

    return new Promise<userWithCredentialsAndSocket>((resolve) => {
        const clientSocket = io('http://localhost:1234', { auth: { token: user.token }, reconnection: false, forceNew: true });
        clientSocket.on('connect', () => {
            const result: userWithCredentialsAndSocket = { ...user, socket: clientSocket }
            resolve(result);
        })
    })
}

export async function getUsersWithSockets(ids: number[]): Promise<userWithCredentialsAndSocket[]> {
    const promiseArray: Promise<userWithCredentialsAndSocket>[] = []

    for (let i = 0; i < ids.length; i++) {
        promiseArray.push(getUserWithSocket(ids[i]))
    }

    return await Promise.all(promiseArray)
}

export async function closeSockets(userWithSocketArray: userWithCredentialsAndSocket[]) {
    for (let i = 0; i < userWithSocketArray.length; i++) {
        await closeSocket(userWithSocketArray[i])
    }
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000)) // TBD - Needed to add this to pass test consistently
}

export async function closeSocket(userWithSocket: userWithCredentialsAndSocket) {
    await new Promise((resolve) => {
        userWithSocket.socket.once('disconnect', () => {
            userWithSocket.socket.removeAllListeners();
            resolve(null);
        });
        userWithSocket.socket.disconnect();
    })
}
