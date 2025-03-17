import type express from 'express'
import type pg from 'pg'
import { verifyJWT } from './jwtWrapper'
import { Result, ok, err } from 'neverthrow'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import type { GameSocketS } from '../sharedTypes/GameNamespaceDefinition'
import { getUser } from 'src/services/user'

export function gameSocketIOAuthentication(socket: GameSocketS, next: any) {
  if (socket.handshake.auth.token == null || socket.handshake.auth.token === '') {
    return next()
  }

  const decoded = verifyJWT(socket.handshake.auth.token)

  if (decoded.isOk()) {
    socket.data.userID = decoded.value.userID
    return next()
  }
  return next(new Error('Token in game authentication could not be verified'))
}

export async function generalSocketIOAuthentication(socket: GeneralSocketS, next: any, pgPool: pg.Pool) {
  if (socket.handshake.auth.token == null) {
    return next()
  }

  const decoded = verifyJWT(socket.handshake.auth.token)

  if (decoded.isOk()) {
    socket.data.userID = decoded.value.userID
  } else {
    socket.emit('logged_out')
  }

  const user = await getUser(pgPool, { id: socket.data.userID })
  if (user.isOk()) {
    socket.data.blockedByModeration = user.value.blockedByModerationUntil != null
  } else {
    socket.emit('logged_out')
  }

  return next()
}

export async function expressAuthentication(request: express.Request, securityName: string, scopes?: string[]): Promise<any> {
  if (securityName !== 'jwt') {
    return Promise.reject({ msg: 'Request does not contain JWT!' })
  }
  if (!request.headers.authorization) {
    return Promise.reject({ msg: 'Request does not contain JWT!' })
  }

  const authSplit = request.headers.authorization.split(' ')
  if (authSplit.length !== 2 || authSplit[0] !== 'Bearer') {
    return Promise.reject({ msg: 'Request does not contain JWT!' })
  }
  const token = authSplit[1]

  const decoded = verifyJWT(token)
  if (decoded.isErr()) {
    return Promise.reject({ msg: 'Your session is not valid!' })
  }
  request.userData = { userID: decoded.value.userID }

  if (scopes === undefined || scopes.length === 0) {
    return Promise.resolve()
  }

  if (scopes.includes('admin')) {
    const admin = await isAdmin(request.app.locals.sqlClient, decoded.value.userID)
    if (admin.isOk() && admin.value) {
      return Promise.resolve()
    }
  }

  return Promise.reject({ msg: 'You have no permission to this resource!' })
}

export async function isAdmin(pgPool: pg.Pool, userID: number): Promise<Result<boolean, 'USER_NOT_FOUND'>> {
  const dbRes = await pgPool.query<{ admin: boolean }>('SELECT admin FROM users WHERE id=$1;', [userID])
  if (dbRes.rowCount === 0) {
    return err('USER_NOT_FOUND')
  }
  return ok(dbRes.rows[0].admin)
}
