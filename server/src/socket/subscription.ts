import type pg from 'pg'
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition'
import type { subscriptionExport } from '../../../shared/types/typesSubscription'
import logger from '../helpers/logger'
import Joi from 'joi'

import { sendNewSubscription, sendCancelSubscription, sendSubscriptionError } from '../communicationUtils/email'
import { subscriptionDetails, getSubscription, cancelSubscription, newSubscription, getNSubscriptions, getInvalidSubscriptionDetails } from '../paypal/paypal'
import { getUser } from '../services/user'

export function initializeSubscription(pgPool: pg.Pool, socket: GeneralSocketS) {
  onGet(pgPool, socket)
}

function emitSubscription(socket: GeneralSocketS, subscription: subscriptionDetails) {
  const data: subscriptionExport = {
    status: subscription.status,
    validuntil: subscription.validuntil,
    freelicense: subscription.freelicense,
  }
  socket.emit('subscription:get', data)
}

async function onGet(pgPool: pg.Pool, socket: GeneralSocketS) {
  if (socket.data.userID === undefined) {
    emitSubscription(socket, getInvalidSubscriptionDetails())
    return
  }

  const sub = await getSubscription(pgPool, socket.data.userID)
  if (sub.isErr()) {
    logger.error(sub.error)
    return
  }
  emitSubscription(socket, sub.value)
}

export async function registerSubscriptionHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('subscription:get', () => {
    onGet(pgPool, socket)
  })

  socket.on('subscription:new', async (subscriptionID, callback) => {
    if (socket.data.userID === undefined) {
      logger.error('Event forbidden for unauthenticated user (subscription:new)', { stack: new Error().stack })
      return
    }

    const schema = Joi.object({
      callback: Joi.function().required(),
      subscriptionID: Joi.string().required(),
    })
    const { error } = schema.validate({ subscriptionID, callback })
    if (error?.details[0]?.path[0] === 'callback') {
      return
    }
    if (error != null) {
      return callback({ status: 400, error: error })
    }

    try {
      const newSubRes = await newSubscription(pgPool, socket.data.userID, subscriptionID)
      if (newSubRes.isErr()) {
        throw new Error(newSubRes.error)
      }
      onGet(pgPool, socket)
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) {
        throw new Error(user.error)
      }
      sendNewSubscription({ user: user.value })
      return callback({ status: 200 })
    } catch (err) {
      const errordata = {
        userid: socket.data.userID,
        subscriptionid: subscriptionID,
        error: err,
      }
      sendSubscriptionError({ error: errordata })
      logger.error('Error in subscription registration', { error: err, data: errordata })
      return callback({ status: 500, error: err })
    }
  })

  socket.on('subscription:cancel', async (callback) => {
    if (socket.data.userID === undefined) {
      logger.error('Event forbidden for unauthenticated user (subscription:cancel)', { stack: new Error().stack })
      return
    }

    try {
      await cancelSubscription(pgPool, socket.data.userID)
      const sub = await getSubscription(pgPool, socket.data.userID)
      if (sub.isErr()) {
        return callback({ status: 500, error: sub.error })
      }
      emitSubscription(socket, sub.value)
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) {
        return callback({ status: 500, error: user.error })
      }
      sendCancelSubscription({ user: user.value })
      return callback({ status: 200 })
    } catch (err) {
      callback({
        status: 500,
        error: err,
      })
    }
  })

  socket.on('subscription:nSubscriptions', async () => {
    try {
      const res = await getNSubscriptions(pgPool)
      socket.emit('subscription:nSubscriptions', res)
    } catch (err) {
      logger.error('Subscription Handler Socket', err)
    }
  })
}
