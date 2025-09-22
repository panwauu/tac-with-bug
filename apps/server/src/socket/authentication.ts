import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import { verifyJWT } from '../helpers/jwtWrapper'
import { initializeSocket, terminateSocket } from './general'
import Joi from 'joi'
import { getUser } from '../services/user'

export function registerAuthHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('login', async (data, callback) => {
    const schema = Joi.object({ token: Joi.string().required().min(1) })
    const { error } = schema.validate(data)
    if (error != null) return callback({ status: 422, error: error })

    await terminateSocket(pgPool, socket)

    const decoded = verifyJWT(data.token)
    if (decoded.isErr()) {
      return callback({ status: 400, error: decoded.error })
    }
    socket.data.userID = decoded.value.userID

    const user = await getUser(pgPool, { id: decoded.value.userID })
    if (user.isErr()) {
      return callback({ status: 400, error: 'User not found' })
    }
    socket.data.blockedByModeration = user.value.blockedByModerationUntil != null

    await initializeSocket(pgPool, socket)

    return callback({ status: 200, data: null })
  })

  socket.on('logout', async (callback) => {
    await logoutSocket(pgPool, socket)

    return callback({ status: 200, data: null })
  })
}

export async function logoutSocket(pgPool: pg.Pool, socket: GeneralSocketS) {
  await terminateSocket(pgPool, socket)
  // @ts-ignore
  socket.data.userID = undefined
  socket.data.blockedByModeration = false
  await initializeSocket(pgPool, socket)
}
