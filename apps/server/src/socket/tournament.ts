import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import Joi from 'joi'

import logger from '../helpers/logger'
import { getLastTournamentWinners, lazyLoadTournamentsTable } from '../services/tournaments'
import { nspGeneral } from './general'

export function registerTournamentHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('tournament:loadTable', async (data, cb) => {
    const schema = Joi.object({
      first: Joi.number().required().integer().min(0),
      limit: Joi.number().required().integer().positive(),
      filter: Joi.required().valid('public', 'private', null),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error: error })

    try {
      const res = await lazyLoadTournamentsTable(pgPool, socket.data.userID, data.limit, data.first, data.filter)
      return cb({ status: 200, data: res })
    } catch (err) {
      logger.error('Error in tournament:private:get', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('tournament:winners:get', async (cb) => {
    const winners = await getLastTournamentWinners(pgPool)
    return cb({ status: 200, data: winners })
  })
}

export async function updateTournamentWinners(pgPool: pg.Pool) {
  const winners = await getLastTournamentWinners(pgPool)
  nspGeneral.emit('tournament:winners:update', winners)
}
