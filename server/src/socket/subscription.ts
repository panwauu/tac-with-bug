import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import type { SubscriptionExport } from '../sharedTypes/typesSubscription'
import logger from '../helpers/logger'
import Joi from 'joi'

import { sendNewSubscription, sendCancelSubscription, sendSubscriptionError } from '../communicationUtils/email'
import { SubscriptionDetails, getSubscription, cancelSubscription, newSubscription, getNSubscriptions, getInvalidSubscriptionDetails } from '../paypal/paypal'
import { getUser } from '../services/user'

export function initializeSubscription(pgPool: pg.Pool, socket: GeneralSocketS) {
  onGet(pgPool, socket)
}

function emitSubscription(socket: GeneralSocketS, subscription: SubscriptionDetails) {
  const data: SubscriptionExport = {
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
  if (sub.isErr()) return
  emitSubscription(socket, sub.value)
}

export function registerSubscriptionHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('subscription:get', () => {
    onGet(pgPool, socket)
  })

  socket.on('subscription:new', async (subscriptionID, callback) => {
    if (socket.data.userID === undefined) return callback({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      callback: Joi.function().required(),
      subscriptionID: Joi.string().required(),
    })
    const { error } = schema.validate({ subscriptionID, callback })
    if (error?.details[0]?.path[0] === 'callback') {
      return
    }
    if (error != null) return callback({ status: 400, error: error })

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
    if (socket.data.userID === undefined) return callback({ status: 500, error: 'UNAUTH' })

    try {
      await cancelSubscription(pgPool, socket.data.userID)
      const sub = await getSubscription(pgPool, socket.data.userID)
      if (sub.isErr()) return callback({ status: 500, error: sub.error })

      emitSubscription(socket, sub.value)
      const user = await getUser(pgPool, { id: socket.data.userID })
      if (user.isErr()) return callback({ status: 500, error: user.error })

      sendCancelSubscription({ user: user.value })
      return callback({ status: 200 })
    } catch (err) {
      callback({ status: 500, error: err })
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
