import type pg from 'pg';
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';
import logger from '../helpers/logger';
import Joi from 'joi';

import { addFriendshipRequest, confirmFriendshipRequest, cancelFriendship, getFriendships, getUser } from '../services/user';
import { getSocketByUserID } from './general';

async function updateFriendOfSocket(pgPool: pg.Pool, socketToUpdate: GeneralSocketS, userID?: number) {
    const friends = userID != null ? await getFriendships(pgPool, userID) : []
    socketToUpdate.emit('friends:update', friends)
}

export function initializeFriends(pgPool: pg.Pool, socket: GeneralSocketS) {
    updateFriendOfSocket(pgPool, socket, socket.data.userID)
}

export async function registerFriendsHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
    socket.on('friends:request', async (username, callback) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (friends:request)', { stack: new Error().stack }); return }

        const { error } = Joi.string().required().validate(username);
        if (error != null) { return callback({ status: 422, error: error }) }

        try {
            const userToRequest = await getUser(pgPool, { username: username })
            if (userToRequest.isErr()) { return callback({ status: 500, error: userToRequest.error }) }

            const userRequesting = await getUser(pgPool, { id: socket.data.userID })
            if (userRequesting.isErr()) { return callback({ status: 500, error: userRequesting.error }) }

            await addFriendshipRequest(pgPool, socket.data.userID, userToRequest.value.id)
            updateFriendOfSocket(pgPool, socket, socket.data.userID)

            const otherUserSocket = getSocketByUserID(userToRequest.value.id)
            if (otherUserSocket != undefined && otherUserSocket.data.userID != undefined) {
                updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
                otherUserSocket?.emit('friends:new-request', { username: userRequesting.value.username })
            }

            return callback({ status: 200 })
        } catch (err) {
            logger.error('Error in Friends Socket Handler', err)
            return callback({ status: 500, error: err })
        }
    });

    socket.on('friends:confirm', async (username, callback) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (friends:confirm)', { stack: new Error().stack }); return }

        const { error } = Joi.string().required().validate(username);
        if (error != null) { return callback({ status: 422, error: error }) }

        try {
            const userRequesting = await getUser(pgPool, { username: username })
            if (userRequesting.isErr()) { return callback({ status: 500, error: userRequesting.error }) }

            const userToConfirm = await getUser(pgPool, { id: socket.data.userID })
            if (userToConfirm.isErr()) { return callback({ status: 500, error: userToConfirm.error }) }

            await confirmFriendshipRequest(pgPool, socket.data.userID, userRequesting.value.id)
            updateFriendOfSocket(pgPool, socket, socket.data.userID)

            const otherUserSocket = getSocketByUserID(userRequesting.value.id)
            if (otherUserSocket != undefined && otherUserSocket.data.userID != undefined) {
                updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
                otherUserSocket.emit('friends:friend-confirmed', { username: userToConfirm.value.username })
            }

            callback({ status: 200 })
        } catch (err) {
            return callback({ status: 500, error: err })
        }
    });

    socket.on('friends:cancel', async (username, callback) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (friends:cancel)', { stack: new Error().stack }); return }

        const { error } = Joi.string().required().validate(username);
        if (error != null) { return callback({ status: 422, error: error }) }

        try {
            const userToCancel = await getUser(pgPool, { username: username })
            if (userToCancel.isErr()) { return callback({ status: 500, error: userToCancel.error }) }

            const userCancelling = await getUser(pgPool, { id: socket.data.userID })
            if (userCancelling.isErr()) { return callback({ status: 500, error: userCancelling.error }) }

            const pendingUser = await cancelFriendship(pgPool, socket.data.userID, userToCancel.value.id)
            updateFriendOfSocket(pgPool, socket, socket.data.userID)

            const otherUserSocket = getSocketByUserID(userToCancel.value.id)
            if (otherUserSocket != undefined && otherUserSocket.data.userID != undefined) {
                updateFriendOfSocket(pgPool, otherUserSocket, otherUserSocket.data.userID)
                if (pendingUser === null) { otherUserSocket?.emit('friends:friend-cancelled', { username: userCancelling.value.username }) }
                else if (pendingUser === userToCancel.value.id) { otherUserSocket?.emit('friends:friend-withdrew', { username: userCancelling.value.username }) }
                else { otherUserSocket?.emit('friends:friend-declined', { username: userCancelling.value.username }) }
            }

            callback({ status: 200 })
        } catch (err) {
            return callback({ status: 500, error: err })
        }
    });

    socket.on('friends:ofUser', async (username, callback) => {
        const { error } = Joi.string().required().validate(username);
        if (error != null) { return callback({ status: 422, error: error }) }

        try {
            const user = await getUser(pgPool, { username: username })
            if (user.isErr()) { throw new Error(user.error) }

            const friendships = await getFriendships(pgPool, user.value.id)
            return callback({ status: 200, data: friendships.filter((f) => f.status === 'done' || user.value.id === socket.data.userID) })
        } catch (err) {
            return callback({ status: 500, error: err })
        }
    });
}