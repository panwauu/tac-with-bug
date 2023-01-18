import type pg from 'pg'
import logger from '../helpers/logger'

import { GameSocketS } from '../sharedTypes/GameNamespaceDefinition'
import Joi from 'joi'
import { getGame } from '../services/game'
import { acceptSubstitution, checkSubstitutionConditions, checkSubstitutionsForTime, rejectSubstitution, startSubstitution } from '../services/substitution'
import { getSocketsInGame, nsp } from './game'

export function registerSubstitutionHandlers(pgPool: pg.Pool, socket: GameSocketS) {
  socket.on('substitution:offer', async (playerIndexToSubstitute, cb) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
      socket.disconnect()
      return cb({ status: 500 })
    }

    await checkSubstitutionsForTime(pgPool)
    const game = await getGame(pgPool, socket.data.gameID)

    if (!checkSubstitutionConditions(game, playerIndexToSubstitute, socket.data.userID)) {
      return cb({ status: 500, error: 'Substitution not allowed' })
    }

    await startSubstitution(pgPool, game, socket.data.userID, playerIndexToSubstitute)
    getSocketsInGame(nsp, socket.data.gameID)
      .filter((s) => s.id !== socket.id)
      .forEach((s) => s.emit('toast:substitution-offer', game.substitution?.substitutionUsername ?? ''))
    return cb({ status: 200 })
  })

  socket.on('substitution:answer', async (data, cb) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
      socket.disconnect()
      return cb({ status: 500 })
    }

    const schema = Joi.object({ accept: Joi.boolean().required() })
    const { error } = schema.validate(data)
    if (error != null) {
      logger.error('JOI Error', error)
      return cb({ status: 500, error: error })
    }

    try {
      await checkSubstitutionsForTime(pgPool)
      const game = await getGame(pgPool, socket.data.gameID)

      if (data.accept) {
        const acceptRes = await acceptSubstitution(pgPool, game, socket.data.userID)
        if (acceptRes.isErr()) {
          return cb({ status: 500, error: acceptRes.error })
        }
      } else {
        const rejectRes = await rejectSubstitution(game, socket.data.userID)
        if (rejectRes.isErr()) {
          return cb({ status: 500 })
        }
        getSocketsInGame(nsp, socket.data.gameID)
          .filter((s) => s.id !== socket.id)
          .forEach((s) => s.emit('toast:substitution-stopped'))
      }

      return cb({ status: 200 })
    } catch (err) {
      return cb({ status: 500 })
    }
  })
}
