import type { GeneralNamespace, GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition.js'
import type pg from 'pg'

import { initializeWaiting, registerWaitingHandlers, terminateWaiting } from './waiting.js'
import { initializeChat, registerChatHandlers } from './chat.js'
import { registerTournamentHandler } from './tournament.js'
import { initializeGames, registerGamesHandler } from './games.js'
import { initializeTutorial, registerTutorialHandler } from './tutorial.js'
import { initializeSubscription, registerSubscriptionHandler } from './subscription.js'
import { initializeFriends, registerFriendsHandlers } from './friends.js'
import { registerAuthHandlers, logoutSocket } from './authentication.js'
import { generalSocketIOAuthentication } from '../helpers/authentication.js'
import { initializeInfo, terminateInfo } from './info.js'
import { registerTournamentPublicHandler, registerTournamentBus } from './tournamentPublic.js'
import { registerTournamentPrivateHandler } from './tournamentPrivate.js'
import { registerChannelHandlers } from './channel.js'

export let nspGeneral: GeneralNamespace

export function registerSocketNspGeneral(nsp: GeneralNamespace, pgPool: pg.Pool) {
  nspGeneral = nsp

  nsp.use(generalSocketIOAuthentication)

  registerTournamentBus()

  nsp.on('connection', async (socket) => {
    socket.on('disconnect', async () => {
      await terminateSocket(pgPool, socket)
    })

    registerAuthHandlers(pgPool, socket)
    registerWaitingHandlers(pgPool, socket)
    registerChatHandlers(pgPool, socket)
    registerTournamentHandler(pgPool, socket)
    registerTournamentPublicHandler(pgPool, socket)
    registerTournamentPrivateHandler(pgPool, socket)
    registerGamesHandler(pgPool, socket)
    registerTutorialHandler(pgPool, socket)
    registerSubscriptionHandler(pgPool, socket)
    registerFriendsHandlers(pgPool, socket)
    registerChannelHandlers(pgPool, socket)

    await initializeSocket(pgPool, socket)
  })
}

export async function initializeSocket(pgPool: pg.Pool, socket: GeneralSocketS) {
  for (const [key, value] of nspGeneral.sockets.entries()) {
    if (key !== socket.id && socket.data.userID != null && value.data.userID === socket.data.userID) {
      value.emit('logged_out')
      await logoutSocket(pgPool, value)
    }
  }

  await initializeInfo()
  await initializeTutorial(pgPool, socket)
  await initializeWaiting(pgPool, socket)
  initializeSubscription(pgPool, socket)
  await initializeGames(pgPool, socket)
  await initializeFriends(pgPool, socket)
  initializeChat(pgPool, socket)
}

export async function terminateSocket(pgPool: pg.Pool, socket: GeneralSocketS) {
  await terminateWaiting(pgPool, socket)
  await terminateInfo()
}

export function isUserOnline(userID: number) {
  return [...nspGeneral.sockets.values()].find((s) => s.data.userID === userID) != null
}

export function getSocketByUserID(userID: number): GeneralSocketS | undefined {
  return [...nspGeneral.sockets.values()].find((s) => s.data.userID === userID)
}
