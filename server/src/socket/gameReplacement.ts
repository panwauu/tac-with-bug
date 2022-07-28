import type pg from 'pg'
import logger from '../helpers/logger'

import { GameSocketS } from '../sharedTypes/GameNamespaceDefinition'
import Joi from 'joi'
import { getGame } from '../services/game'
import { acceptReplacement, checkReplacementConditions, endReplacementOnTime, rejectReplacement, startReplacement } from '../services/replacement'
import { getSocketsInGame, nsp } from './game'

export function registerReplacementHandlers(pgPool: pg.Pool, socket: GameSocketS) {
  socket.on('replacement:offer', async (cb) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
      socket.disconnect()
      return cb({ status: 500 })
    }

    const game = await getGame(pgPool, socket.data.gameID)
    await endReplacementOnTime(pgPool, game)

    if (checkReplacementConditions(game, game.game.activePlayer, socket.data.userID)) {
      await startReplacement(pgPool, game, socket.data.userID, game.game.activePlayer)
      getSocketsInGame(nsp, socket.data.gameID)
        .filter((s) => s.id != socket.id)
        .forEach((s) => s.emit('toast:replacement-offer', game.game.replacement?.replacementUsername ?? ''))
      return cb({ status: 200 })
    }

    return cb({ status: 500 })
  })

  socket.on('replacement:answer', async (data, cb) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
      socket.disconnect()
      return cb({ status: 500 })
    }

    const schema = Joi.object({ accept: Joi.boolean().required() })
    const { error } = schema.validate(data)
    if (error != null) {
      logger.error('JOI Error', error)
      return cb({ status: 500 })
    }

    try {
      const game = await getGame(pgPool, socket.data.gameID)
      await endReplacementOnTime(pgPool, game)

      if (data.accept) {
        if (socket.data.gamePlayer < 0 || socket.data.gamePlayer >= game.nPlayers) {
          return cb({ status: 500 })
        }
        const acceptRes = await acceptReplacement(pgPool, game, socket.data.userID)
        if (acceptRes.isErr()) {
          return cb({ status: 500 })
        }
      } else {
        if ((socket.data.gamePlayer < 0 || socket.data.gamePlayer >= game.nPlayers) && socket.data.userID !== game.game.replacement?.replacementUserID) {
          return cb({ status: 500 })
        }
        const rejectRes = await rejectReplacement(pgPool, game, socket.data.userID)
        if (rejectRes.isErr()) {
          return cb({ status: 500 })
        }
        getSocketsInGame(nsp, socket.data.gameID)
          .filter((s) => s.id != socket.id)
          .forEach((s) => s.emit('toast:replacement-stopped'))
      }

      return cb({ status: 200 })
    } catch (err) {
      return cb({ status: 500 })
    }
  })
}
