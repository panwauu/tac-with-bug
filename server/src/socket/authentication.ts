import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import { verifyJWT } from '../helpers/jwtWrapper'
import { initializeSocket, terminateSocket } from './general'

export function registerAuthHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('login', async ({ token }, callback) => {
    if (typeof token !== 'string') {
      return callback({ status: 422, error: 'NO_TOKEN' })
    }

    await terminateSocket(pgPool, socket)

    const decoded = verifyJWT(token)
    if (decoded.isErr()) {
      return callback({ status: 400, error: decoded.error })
    }
    socket.data.userID = decoded.value.userID
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
  socket.data.userID = undefined
  await initializeSocket(pgPool, socket)
}
