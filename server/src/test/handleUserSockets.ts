import type { GeneralSocketC } from '../test/socket'
import { io } from 'socket.io-client'
import { connectSocket } from './handleSocket'
import Chance from 'chance'
import { sleep } from '../helpers/sleep'
const chance = new Chance()

export interface User {
  authHeader: string
  token: string
  id: number
  username: string
  email: string
  password: string
  locale: string
}

export interface UserWithSocket extends User {
  socket: GeneralSocketC
}

async function getUser(id: number): Promise<User> {
  const userResponse = await testServer.pgPool.query<{ id: number; username: string; email: string; locale: string }>(
    'SELECT id, username, email, locale FROM users WHERE id = $1;',
    [id]
  )
  if (userResponse.rows.length !== 1) {
    throw new Error('Could not query user')
  }

  const loginResponse = await testAgent.post('/gameApi/login').send({ username: userResponse.rows[0].username, password: 'password' })
  if (loginResponse.status !== 200) {
    throw new Error(`Login failed: ${loginResponse.status}; ${loginResponse.text}`)
  }

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

async function getUserWithSocket(id: number): Promise<UserWithSocket> {
  const user = await getUser(id)

  let port = (global as any).testServer.httpServer.address().port
  const clientSocket = io(`http://localhost:${port}`, { auth: { token: user.token }, reconnection: false, forceNew: true, autoConnect: false }) as any
  await connectSocket(clientSocket)
  const result: UserWithSocket = { ...user, socket: clientSocket }
  return result
}

export async function getUsersWithSockets(data: { ids: number[] } | { n: number }): Promise<UserWithSocket[]> {
  const availableIDs = [1, 2, 3, 4, 5, 6, 7, 8]
  if ('ids' in data && (!data.ids.every((id) => availableIDs.includes(id)) || new Set(data.ids).size !== data.ids.length)) {
    throw new Error('Cannot get test users')
  }
  if ('n' in data && data.n > availableIDs.length) {
    throw new Error(`Cannot get ${data.n} test users`)
  }

  const ids = 'ids' in data ? data.ids : [1, 2, 3, 4, 5, 6, 7, 8].slice(0, data.n)
  const promiseArray: Promise<UserWithSocket>[] = []

  for (const id of ids) {
    promiseArray.push(getUserWithSocket(id))
  }

  const result = await Promise.all(promiseArray)
  await sleep(1000) // TBD - Needed to add this to pass test consistently
  return result
}

export async function registerUserAndReturnCredentials(): Promise<User> {
  const validBody = {
    username: chance.string({ length: 12, pool: 'abcdefgABCDEFG' }),
    email: `${chance.string({ length: 12, pool: 'abcdefgABCDEFG' })}@asdfasgdsafd.com`,
    password: 'password',
    locale: 'de',
  }

  const signUpRes = await testAgent.post('/gameApi/sign-up').send(validBody)
  if (signUpRes.status !== 201) {
    throw new Error(`Sign-up failed: ${signUpRes.status}; ${signUpRes.text}`)
  }

  const dbRes = await testServer.pgPool.query('SELECT * FROM users WHERE username = $1;', [validBody.username])
  const activationRes = await testAgent.get('/gameApi/activation').query({ userID: dbRes.rows[0].id, token: dbRes.rows[0].token })
  if (activationRes.status !== 200) {
    throw new Error(`Activation failed: ${activationRes.status}; ${activationRes.text}`)
  }

  const response = await testAgent.post('/gameApi/login').send({ username: validBody.username, password: validBody.password })
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status}; ${response.text}`)
  }

  return {
    ...validBody,
    authHeader: `Bearer ${response.body.token}`,
    token: response.body.token,
    id: dbRes.rows[0].id,
  }
}

export async function unregisterUser(userWithCredentials: User) {
  const res = await testAgent.delete('/gameApi/deleteUser').set({ Authorization: userWithCredentials.authHeader }).send()
  if (res.statusCode !== 204) {
    throw new Error('Could not delete user')
  }
}

export async function getUnauthenticatedSocket(opts?: { connect: boolean }): Promise<GeneralSocketC> {
  let port = (global as any).testServer.httpServer.address().port
  const clientSocket = io(`http://localhost:${port}`, { reconnection: false, forceNew: true, autoConnect: false }) as any
  if (opts?.connect == null || opts?.connect === true) {
    await connectSocket(clientSocket)
  }
  return clientSocket
}
