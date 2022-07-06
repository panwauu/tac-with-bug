import type pg from 'pg'
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition'
import logger from '../helpers/logger'

import Joi from 'joi'
import { addChannelMessage, getChannelMessages } from '../services/channel'
import { nspGeneral } from './general'

export async function registerChannelHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('channel:sendMessage', async (data, cb) => {
    if (socket.data.userID === undefined) {
      logger.error('Event forbidden for unauthenticated user (channel:sendMessage)')
      return cb({ status: 500, error: 'UNAUTH' })
    }

    const schema = Joi.object({
      channel: Joi.string().required().min(1),
      body: Joi.string().required().min(1).max(500),
    })
    const { error } = schema.validate(data)
    if (error != null) {
      return cb({ status: 500, error: error })
    }

    await addChannelMessage(pgPool, socket.data.userID, data.body.trim(), data.channel)
    const messages = await getChannelMessages(pgPool, data.channel)
    nspGeneral.emit('channel:update', { channel: data.channel, messages })
    return cb({ status: 200 })
  })

  socket.on('channel:load', async (data, cb) => {
    const schema = Joi.object({ channel: Joi.string().required() })
    const { error } = schema.validate(data)
    if (error != null) {
      return cb({ status: 500, error: error })
    }

    const messages = await getChannelMessages(pgPool, data.channel)
    return cb({ status: 200, data: { channel: data.channel, messages } })
  })
}
