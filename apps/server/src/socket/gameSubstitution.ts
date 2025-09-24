import type pg from 'pg'
import logger from '../helpers/logger'

import type { GameSocketS } from '../sharedTypes/GameNamespaceDefinition'
import Joi from 'joi'
import { getGame } from '../services/game'
import { acceptSubstitution, checkSubstitutionsForTime, rejectSubstitution, startSubstitution } from '../services/substitution'
import { getSocketsInGame, nsp, emitOnlinePlayersEvents } from './game'
import { sleep } from '../helpers/sleep'

export function registerSubstitutionHandlers(pgPool: pg.Pool, socket: GameSocketS) {
  socket.on('substitution:start', async (playerIndexToSubstitute, substituteByBotID, cb) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
      socket.disconnect()
      return cb({ status: 500 })
    }

    await checkSubstitutionsForTime(pgPool)
    const game = await getGame(pgPool, socket.data.gameID)

    const res = await startSubstitution(pgPool, game, socket.data.userID, playerIndexToSubstitute, substituteByBotID)
    if (res.isErr()) return cb({ status: 500, error: res.error })

    for (const s of getSocketsInGame(nsp, socket.data.gameID).filter((s) => s.id !== socket.id)) {
      s.emit(
        'toast:substitution-started',
        game.substitution?.substitute.username ?? game.substitution?.substitute.botUsername ?? '',
        game.players.at(game.substitution?.playerIndexToSubstitute ?? 0) ?? ''
      )
    }

    await acceptSubstitution(pgPool, game, socket.data.userID)
    await emitOnlinePlayersEvents(pgPool, nsp, game.id)
    sleep(1000).then(() => emitOnlinePlayersEvents(pgPool, nsp, game.id))

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
          return cb({ status: 500, error: rejectRes.error })
        }
        for (const s of getSocketsInGame(nsp, socket.data.gameID).filter((s) => s.id !== socket.id)) {
          s.emit('toast:substitution-stopped')
        }
      }

      await emitOnlinePlayersEvents(pgPool, nsp, game.id)
      sleep(1000).then(() => emitOnlinePlayersEvents(pgPool, nsp, game.id))
      return cb({ status: 200 })
    } catch (err) {
      return cb({ status: 500 })
    }
  })
}
