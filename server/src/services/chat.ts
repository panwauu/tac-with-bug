import type pg from 'pg';
import type { chatElement, chatMessage } from '../../../shared/types/chat'

import { err, ok, Result } from 'neverthrow';
import { maxUsersInChat } from '../../../shared/shared/chat'

export async function sanitizeChatDatabase(pgPool: pg.Pool) {
    pgPool.query('DELETE FROM chat_messages WHERE current_timestamp - created > interval \'1 year\';')
}

export async function getUsersInChat(pgPool: pg.Pool, chatid: number) {
    const userres = await pgPool.query<{ userid: number }>('SELECT userid FROM users_to_chats WHERE chatid=$1;', [chatid])
    return userres.rows.map((r) => r.userid)
}

export type createChatError = 'NORMAL_CHAT_NEEDS_TWO_USERS' | 'CHAT_DOES_ALREADY_EXIST' | 'CHAT_COULD_NOT_BE_CREATED'
export async function createChat(pgPool: pg.Pool, userids: number[], title: string | null): Promise<Result<number, createChatError>> {
    if (title == null && userids.length != 2) { return err('NORMAL_CHAT_NEEDS_TWO_USERS') }

    if (title == null) {
        const res = await pgPool.query('SELECT chats.id FROM chats JOIN users_to_chats ON chats.id = users_to_chats.chatid WHERE chats.group_chat = False GROUP BY chats.id HAVING array_agg(users_to_chats.userid) <@ $1::INT[] AND array_agg(users_to_chats.userid) @> $1::INT[];', [userids])
        if (res.rows.length > 0) { return err('CHAT_DOES_ALREADY_EXIST') }
    }

    const res = await pgPool.query<{ chatid: number }>(`
        With
            inserted_chat (id) AS (INSERT INTO chats (group_chat, group_name) VALUES ($1, $3) RETURNING id)
        INSERT INTO users_to_chats (userid, chatid) SELECT 
            userid_entry As userid, 
            (SELECT id FROM inserted_chat LIMIT 1) as chatid 
        FROM unnest($2::INT[]) userid_entry RETURNING chatid;`, [title != null, userids, title])

    if (res.rows.length === 0) { return err('CHAT_COULD_NOT_BE_CREATED') }
    return ok(res.rows[0].chatid)
}

export async function changeGroupName(pgPool: pg.Pool, chatid: number, title: string): Promise<Result<null, 'GROUP_NAME_NOT_CHANGED'>> {
    const res = await pgPool.query('UPDATE chats SET group_name = $2 WHERE id = $1 RETURNING *;', [chatid, title])
    if (res.rows.length != 1) { return err('GROUP_NAME_NOT_CHANGED') }
    return ok(null)
}

export type addUserToChatError = 'CHAT_NOT_FOUND' | 'USER_LIMIT_IS_ALREADY_REACHED' | 'CAN_ONLY_ADD_TO_GROUP_CHAT' | 'USER_COULD_NOT_BE_ADDED'
export async function addUserToChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<number[], addUserToChatError>> {
    const res = await pgPool.query<{ group_chat: boolean, userids: number[] }>('SELECT chats.group_chat, array_agg(users_to_chats.userid) as userids FROM chats JOIN users_to_chats ON chats.id = users_to_chats.chatid WHERE chats.id = $1 GROUP BY chats.id;', [chatid])
    if (res.rows.length != 1) { return err('CHAT_NOT_FOUND') }
    if (!res.rows[0].group_chat) { return err('CAN_ONLY_ADD_TO_GROUP_CHAT') }
    if (res.rows[0].userids.length >= maxUsersInChat - 1) { return err('USER_LIMIT_IS_ALREADY_REACHED') }

    const insertRes = await pgPool.query('INSERT INTO users_to_chats (userid, chatid) VALUES ($1, $2) RETURNING *;', [userid, chatid])
    if (insertRes.rows.length === 0) { return err('USER_COULD_NOT_BE_ADDED') }
    return ok(res.rows[0].userids.concat(userid))
}

export type leaveChatError = 'CHAT_COULD_NOT_BE_LEFT'
export async function leaveChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<null, leaveChatError>> {
    const res = await pgPool.query('DELETE FROM users_to_chats WHERE userid = $1 AND chatid = $2 RETURNING *;', [userid, chatid])
    if (res.rows.length != 1) { return err('CHAT_COULD_NOT_BE_LEFT') }
    return ok(null)
}

export type insertChatMessageError = 'SENDER_IS_NOT_PART_OF_CHAT'
export async function insertChatMessage(pgPool: pg.Pool, sender_user_id: number, chatid: number, body: string): Promise<Result<number[], insertChatMessageError>> {
    const users_in_chat = await getUsersInChat(pgPool, chatid)
    if (users_in_chat.every((userid) => userid != sender_user_id)) { return err('SENDER_IS_NOT_PART_OF_CHAT') }

    const res = await pgPool.query<{ userid: number }>(`
        WITH
            inserted_message (id) AS ( INSERT INTO chat_messages (sender, chatid, body) VALUES ($1, $2, $3) RETURNING id ),
            users_with_unread (users_to_chats_id) AS (
                INSERT INTO chat_messages_unread (users_to_chats_id, messageid) SELECT id as users_to_chats_id, (SELECT id FROM inserted_message) as messageid FROM users_to_chats WHERE userid != $1 AND chatid = $2 RETURNING users_to_chats_id
            )
        SELECT userid FROM users_with_unread JOIN users_to_chats ON users_to_chats.id = users_with_unread.users_to_chats_id;`, [sender_user_id, chatid, body])

    return ok(res.rows.map((r) => r.userid))
}

export async function markChatAsRead(pgPool: pg.Pool, userid: number, chatid: number): Promise<void> {
    await pgPool.query('DELETE FROM chat_messages_unread USING users_to_chats WHERE users_to_chats.userid = $1 AND users_to_chats.chatid = $2;', [userid, chatid])
}

export type loadChatError = 'USER_NOT_PART_OF_CHAT'
export async function loadChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<chatMessage[], loadChatError>> {
    const users_in_chat = await getUsersInChat(pgPool, chatid)
    if (!users_in_chat.includes(userid)) { return err('USER_NOT_PART_OF_CHAT') }

    const res = await pgPool.query<{ id: number, body: string, created: any, sender: string | null }>(`
    SELECT * FROM (
        SELECT
            chat_messages.id, chat_messages.body, chat_messages.created, users.username as sender
        FROM chat_messages 
            LEFT JOIN users ON users.id = chat_messages.sender
        WHERE chat_messages.chatid=$1 ORDER BY id DESC LIMIT 200
    ) sub ORDER BY id ASC;`, [chatid])

    return ok(res.rows)
}

export async function loadChatOverview(pgPool: pg.Pool, userid: number): Promise<chatElement[]> {
    const res = await pgPool.query<{ last_message: string, chatid: number, group_chat: boolean, group_name: string, created: string, players: string[], number_of_unread: number }>(`
        WITH
            chatids (id) AS ( SELECT chatid FROM users_to_chats WHERE userid=$1 )
        SELECT 
        (SELECT created FROM chat_messages WHERE chatid=chatids.id ORDER BY id DESC LIMIT 1) as last_message,
            chatids.id as chatid, group_chat, group_name, created,
            (SELECT array_agg(users.username) FROM users_to_chats JOIN users ON users_to_chats.userid = users.id WHERE chatid = chatids.id AND users_to_chats.userid != $1 GROUP BY chatid) as players,
            (SELECT COUNT(*)::INT FROM chat_messages_unread JOIN users_to_chats ON chat_messages_unread.users_to_chats_id = users_to_chats.id WHERE userid=$1 AND chatid = chatids.id) as number_of_unread
        FROM chatids JOIN chats ON chatids.id = chats.id;`, [userid])

    return res.rows.map((r) => {
        return {
            chatid: r.chatid,
            groupChat: r.group_chat,
            groupTitle: r.group_name,
            created: r.created,
            lastMessage: r.last_message,
            players: r.players,
            numberOfUnread: r.number_of_unread,
        }
    })
}
