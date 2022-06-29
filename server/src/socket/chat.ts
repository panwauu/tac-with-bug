import type pg from 'pg';
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';
import logger from '../helpers/logger';

import { getSocketByUserID } from './general';
import { addUserToChat, changeGroupName, createChat, getUsersInChat, insertChatMessage, leaveChat, loadChat, loadChatOverview, markChatAsRead } from '../services/chat';
import Joi from 'joi';

export function initializeChat(pgPool: pg.Pool, socket: GeneralSocketS) {
    if (socket.data.userID != undefined) { updateOverviewForAll(pgPool, [socket.data.userID]) }
    else { socket.emit('chat:overview:update', []); }
}

export async function registerChatHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
    socket.on('chat:startChat', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:startChat)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ title: Joi.string().required().allow(null), userids: Joi.array().required().items(Joi.number().min(0)) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const res = await createChat(pgPool, data.userids.concat(socket.data.userID), data.title)
        if (res.isErr()) { return cb({ status: 500, error: res.error }) }

        await updateOverviewForAll(pgPool, data.userids.concat(socket.data.userID))

        const chatOverview = await loadChatOverview(pgPool, socket.data.userID)
        return cb({ status: 200, data: { overview: chatOverview, chatid: res.value } })
    })

    socket.on('chat:addUser', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:addUser)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ userid: Joi.number().required().min(0), chatid: Joi.number().required().min(0) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const res = await addUserToChat(pgPool, data.userid, data.chatid)
        if (res.isErr()) { return cb({ status: 500, error: res.error }) }

        await updateOverviewForAll(pgPool, res.value)

        return cb({ status: 200 })
    })

    socket.on('chat:changeTitle', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:changeTitle)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ title: Joi.string().required().min(2), chatid: Joi.number().required().min(0) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const res = await changeGroupName(pgPool, data.chatid, data.title)
        if (res.isErr()) { return cb({ status: 500, error: res.error }) }

        const users_in_chat = await getUsersInChat(pgPool, data.chatid)
        await updateOverviewForAll(pgPool, users_in_chat)

        return cb({ status: 200 })
    })

    socket.on('chat:leaveChat', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:leaveChat)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ chatid: Joi.number().required().min(0) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const users_in_chat = await getUsersInChat(pgPool, data.chatid)

        const res = await leaveChat(pgPool, socket.data.userID, data.chatid)
        if (res.isErr()) { return cb({ status: 500, error: res.error }) }

        await updateOverviewForAll(pgPool, users_in_chat)

        return cb({ status: 200 })
    })

    socket.on('chat:markAsRead', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:markAsRead)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ chatid: Joi.number().required().min(0) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        await markChatAsRead(pgPool, socket.data.userID, data.chatid)
        const chatOverview = await loadChatOverview(pgPool, socket.data.userID)
        socket.emit('chat:overview:update', chatOverview)
        return cb({ status: 200 })
    })

    socket.on('chat:sendMessage', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:sendMessage)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ chatid: Joi.number().required().min(0), body: Joi.string().required().min(1).max(500) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const res = await insertChatMessage(pgPool, socket.data.userID, data.chatid, data.body)
        if (res.isErr()) { return cb({ status: 500, error: res.error }) }
        await updateUsersAfterMessage(pgPool, res.value.concat(socket.data.userID), data.chatid)
        return cb({ status: 200 })
    })

    socket.on('chat:singleChat:load', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:singleChat:load)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const schema = Joi.object({ chatid: Joi.number().required().min(0) });
        const { error } = schema.validate(data);
        if (error != null) { return cb({ status: 500, error: error }) }

        const chat = await loadChat(pgPool, socket.data.userID, data.chatid)
        if (chat.isErr()) { return cb({ status: 500, error: chat.error }) }
        return cb({ status: 200, data: { chatid: data.chatid, messages: chat.value } })
    })

    socket.on('chat:overview:load', async (cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (chat:overview:load)'); return cb({ status: 500, error: 'UNAUTH' }) }

        const chat = await loadChatOverview(pgPool, socket.data.userID)
        return cb({ status: 200, data: chat })
    })
}

async function updateOverviewForAll(pgPool: pg.Pool, userIDs: number[]) {
    for (const userID of userIDs) {
        const chatOverview = await loadChatOverview(pgPool, userID)
        const socket = getSocketByUserID(userID)
        socket?.emit('chat:overview:update', chatOverview)
    }
}

async function updateUsersAfterMessage(pgPool: pg.Pool, userIDs: number[], chatid: number) {
    for (const userID of userIDs) {
        const messages = await loadChat(pgPool, userID, chatid)
        if (messages.isErr()) { continue }
        const chatOverview = await loadChatOverview(pgPool, userID)
        const socket = getSocketByUserID(userID)
        socket?.emit('chat:singleChat:update', { chatid, messages: messages.value })
        socket?.emit('chat:overview:update', chatOverview)
    }
}
