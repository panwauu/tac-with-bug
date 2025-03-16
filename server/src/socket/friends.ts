import type pg from 'pg'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import logger from '../helpers/logger'
import Joi from 'joi'

import { addFriendshipRequest, confirmFriendshipRequest, cancelFriendship, getFriendships, getUser } from '../services/user'
import { getSocketByUserID, isUserOnline } from './general'
import { getEmailNotificationSettings } from '../services/settings'
import { sendFriendRequestReminder } from '../communicationUtils/email'

async function updateFriendOfSocket(pgPool: pg.Pool, socketToUpdate: GeneralSocketS, userID?: number) {
  const friends = userID != null ? await getFriendships(pgPool, userID) : []
  socketToUpdate.emit('friends:update', friends)
}

export async function initializeFriends(pgPool: pg.Pool, socket: GeneralSocketS) {
  await updateFriendOfSocket(pgPool, socket, socket.data.userID)
}

export function registerFriendsHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('friends:request', async (username, callback) => {
    if (socket.data.userID === undefined) return callback({ status: 500, error: 'UNAUTH' })

    const { error } = Joi.string().required().validate(username)
    if (error != null) return callback({ status: 422, error: error })

    if (socket.data.blockedByModeration === true) return callback({ status: 400, error: 'BlockedByModeration' })

    try {
      const userToRequest = await getUser(pgPool, { username: username })
      if (userToRequest.isErr()) return callback({ status: 500, error: userToRequest.error })

      const userRequesting = await getUser(pgPool, { id: socket.data.userID })
      if (userRequesting.isErr()) return callback({ status: 500, error: userRequesting.error })

      await addFriendshipRequest(pgPool, socket.data.userID, userToRequest.value.id)
      await updateFriendOfSocket(pgPool, socket, socket.data.userID)

      const otherUserSocket = getSocketByUserID(userToRequest.value.id)
      if (otherUserSocket?.data?.userID != null) {
        await updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
        otherUserSocket?.emit('friends:new-request', { username: userRequesting.value.username })
      }

      const emailNotificationSettings = await getEmailNotificationSettings(pgPool, userToRequest.value.id)
      if (emailNotificationSettings.isOk() && emailNotificationSettings.value.friendRequests) {
        await sendFriendRequestReminder({ user: userToRequest.value })
      }

      return callback({ status: 200 })
    } catch (err) {
      logger.error('Error in Friends Socket Handler', err)
      return callback({ status: 500, error: err })
    }
  })

  socket.on('friends:confirm', async (username, callback) => {
    if (socket.data.userID === undefined) return callback({ status: 500, error: 'UNAUTH' })

    const { error } = Joi.string().required().validate(username)
    if (error != null) return callback({ status: 422, error: error })

    try {
      const userRequesting = await getUser(pgPool, { username: username })
      if (userRequesting.isErr()) return callback({ status: 500, error: userRequesting.error })

      const userToConfirm = await getUser(pgPool, { id: socket.data.userID })
      if (userToConfirm.isErr()) return callback({ status: 500, error: userToConfirm.error })

      await confirmFriendshipRequest(pgPool, socket.data.userID, userRequesting.value.id)
      await updateFriendOfSocket(pgPool, socket, socket.data.userID)

      const otherUserSocket = getSocketByUserID(userRequesting.value.id)
      if (otherUserSocket?.data?.userID != null) {
        await updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
        otherUserSocket.emit('friends:friend-confirmed', { username: userToConfirm.value.username })
      }

      callback({ status: 200 })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('friends:cancel', async (username, callback) => {
    if (socket.data.userID === undefined) return callback({ status: 500, error: 'UNAUTH' })

    const { error } = Joi.string().required().validate(username)
    if (error != null) return callback({ status: 422, error: error })

    try {
      const userToCancel = await getUser(pgPool, { username: username })
      if (userToCancel.isErr()) return callback({ status: 500, error: userToCancel.error })

      const userCancelling = await getUser(pgPool, { id: socket.data.userID })
      if (userCancelling.isErr()) return callback({ status: 500, error: userCancelling.error })

      const pendingUser = await cancelFriendship(pgPool, socket.data.userID, userToCancel.value.id)
      await updateFriendOfSocket(pgPool, socket, socket.data.userID)

      const otherUserSocket = getSocketByUserID(userToCancel.value.id)
      if (otherUserSocket?.data?.userID != null) {
        await updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
        if (pendingUser === null) {
          otherUserSocket?.emit('friends:friend-cancelled', { username: userCancelling.value.username })
        } else if (pendingUser === userToCancel.value.id) {
          otherUserSocket?.emit('friends:friend-withdrew', { username: userCancelling.value.username })
        } else {
          otherUserSocket?.emit('friends:friend-declined', { username: userCancelling.value.username })
        }
      }

      callback({ status: 200 })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('friends:ofUser', async (username, callback) => {
    const { error } = Joi.string().required().validate(username)
    if (error != null) return callback({ status: 422, error: error })

    try {
      const user = await getUser(pgPool, { username: username })
      if (user.isErr()) {
        throw new Error(user.error)
      }

      const friendships = await getFriendships(pgPool, user.value.id)
      return callback({ status: 200, data: friendships.filter((f) => f.status === 'done' || user.value.id === socket.data.userID) })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('friends:isFriendOnline', async (username, callback) => {
    const { error } = Joi.string().required().validate(username)
    if (error != null) return callback({ status: 422, error: error })

    try {
      if (socket.data.userID == null) return callback({ status: 500, error: 'Unauthorized socket' })

      const friendships = await getFriendships(pgPool, socket.data.userID)
      const friendship = friendships.find((f) => f.status === 'done' && f.username === username)
      if (friendship == null) return callback({ status: 500, error: 'You can only see the online status of your friends' })

      const friend = await getUser(pgPool, { username: username })
      if (friend.isErr()) return callback({ status: 500, error: friend.error })

      return callback({ status: 200, data: isUserOnline(friend.value.id) })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })
}
