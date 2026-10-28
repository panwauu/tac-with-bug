import type pg from 'pg'
import Joi from 'joi'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import { ONLINE_STUFEN } from '@repo/core/bot/netz/onlineStufen'
import logger from '../helpers/logger'

// A game against the AI takes minutes; a socket that reports faster is not counted
const minSecondsBetweenResults = 60

const lastResultOfSocket = new WeakMap<GeneralSocketS, number>()

/**
 * Games against the AI in the browser (#256): the client reports how a game ended, without any account
 * or name, so that the bots can be judged and the use of the platform counted. Nothing else is stored.
 */
export function registerOfflineResultHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('ki:result', async (data, cb) => {
    const schema = Joi.object({
      mode: Joi.string().valid('klassisch', 'drei', 'koop').required(),
      level: Joi.string()
        .valid(...ONLINE_STUFEN.map((s) => s.stufe))
        .required(),
      won: Joi.boolean().required(),
      cards: Joi.number().integer().min(0).max(10000).allow(null).required(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 422, error })

    // The level has to belong to the mode, like the online bots
    if (ONLINE_STUFEN.find((s) => s.stufe === data.level)?.modus !== data.mode) return cb({ status: 422, error: 'LEVEL_NOT_IN_MODE' })

    const last = lastResultOfSocket.get(socket)
    if (last != null && Date.now() - last < minSecondsBetweenResults * 1000) return cb({ status: 429, error: 'TOO_MANY_RESULTS' })
    lastResultOfSocket.set(socket, Date.now())

    try {
      await pgPool.query('INSERT INTO offline_results (mode, level, won, cards) VALUES ($1, $2, $3, $4);', [
        data.mode,
        data.level,
        data.won,
        data.mode === 'koop' ? data.cards : null,
      ])
      return cb({ status: 200, data: null })
    } catch (err) {
      logger.error('Error in ki:result', err)
      return cb({ status: 500, error: err })
    }
  })
}
