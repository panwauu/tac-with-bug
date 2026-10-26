import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'

import Joi from 'joi'
import { addChannelMessage, getChannelMessages, isPlayerOfGameChannel } from '../services/channel'
import { nspGeneral } from './general'
import { isAdmin } from '../helpers/authentication'

export function registerChannelHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('channel:sendMessage', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      channel: Joi.string().required().min(1),
      body: Joi.string().required().min(1).max(500),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error })

    if (!(await mayWriteInChannel(pgPool, data.channel, socket.data.userID))) return cb({ status: 500, error: 'NOT_ALLOWED_IN_CHANNEL' })

    if (socket.data.blockedByModeration === true) return cb({ status: 400, error: 'BlockedByModeration' })

    await addChannelMessage(pgPool, socket.data.userID, data.body.trim(), data.channel)
    const page = await getChannelMessages(pgPool, data.channel)
    nspGeneral.emit('channel:update', { channel: data.channel, messages: page.messages })
    return cb({ status: 200 })
  })

  socket.on('channel:load', async (data, cb) => {
    const schema = Joi.object({ channel: Joi.string().required(), beforeMessageId: Joi.number().min(0) })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 500, error: error })

    const page = await getChannelMessages(pgPool, data.channel, data.beforeMessageId)
    const mayWrite = socket.data.userID !== undefined && (await mayWriteInChannel(pgPool, data.channel, socket.data.userID))
    return cb({ status: 200, data: { channel: data.channel, mayWrite, ...page } })
  })
}

/** Only admins may write in the news channel and only the players of a game in its channel. */
async function mayWriteInChannel(pgPool: pg.Pool, channel: string, userID: number) {
  if (channel === 'news') {
    const admin = await isAdmin(pgPool, userID)
    return admin.isOk() && admin.value
  }

  const gameChannel = /^g-(\d+)$/.exec(channel)
  if (gameChannel != null) {
    return isPlayerOfGameChannel(pgPool, Number.parseInt(gameChannel[1]), userID)
  }

  return true
}
