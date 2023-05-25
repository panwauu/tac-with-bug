import type pg from 'pg'
import type { ChatElement, ChatMessage } from '../sharedTypes/chat'

import { err, ok, Result } from 'neverthrow'
import { maxUsersInChat } from '../sharedDefinitions/chat'
import { sendUnreadMessagesReminder } from 'src/communicationUtils/email'

export async function sanitizeChatDatabase(pgPool: pg.Pool) {
  pgPool.query("DELETE FROM chat_messages WHERE current_timestamp - created > interval '1 year';")
}

export async function getUsersInChat(pgPool: pg.Pool, chatid: number) {
  const userres = await pgPool.query<{ userid: number }>('SELECT userid FROM users_to_chats WHERE chatid=$1;', [chatid])
  return userres.rows.map((r) => r.userid)
}

export type CreateChatError = 'NORMAL_CHAT_NEEDS_TWO_USERS' | 'CHAT_DOES_ALREADY_EXIST' | 'CHAT_COULD_NOT_BE_CREATED'
export async function createChat(pgPool: pg.Pool, userids: number[], title: string | null): Promise<Result<number, CreateChatError>> {
  if (title == null && userids.length !== 2) {
    return err('NORMAL_CHAT_NEEDS_TWO_USERS')
  }

  if (title == null) {
    const query = `SELECT chats.id FROM chats 
      JOIN users_to_chats ON chats.id = users_to_chats.chatid 
      WHERE chats.group_chat = False GROUP BY chats.id HAVING array_agg(users_to_chats.userid) <@ $1::INT[] AND array_agg(users_to_chats.userid) @> $1::INT[];`
    const res = await pgPool.query(query, [userids])
    if (res.rows.length > 0) {
      return err('CHAT_DOES_ALREADY_EXIST')
    }
  }

  const res = await pgPool.query<{ chatid: number }>(
    `With
      inserted_chat (id) AS (INSERT INTO chats (group_chat, group_name) VALUES ($1, $3) RETURNING id)
    INSERT INTO users_to_chats (userid, chatid) SELECT 
      userid_entry As userid, 
      (SELECT id FROM inserted_chat LIMIT 1) as chatid 
    FROM unnest($2::INT[]) userid_entry RETURNING chatid;`,
    [title != null, userids, title]
  )

  if (res.rows.length === 0) {
    return err('CHAT_COULD_NOT_BE_CREATED')
  }
  return ok(res.rows[0].chatid)
}

export async function changeGroupName(pgPool: pg.Pool, chatid: number, title: string): Promise<Result<null, 'GROUP_NAME_NOT_CHANGED'>> {
  const res = await pgPool.query('UPDATE chats SET group_name = $2 WHERE id = $1 AND group_chat = TRUE RETURNING *;', [chatid, title])
  if (res.rows.length !== 1) {
    return err('GROUP_NAME_NOT_CHANGED')
  }
  return ok(null)
}

export type AddUserToChatError = 'CHAT_NOT_FOUND' | 'USER_LIMIT_IS_ALREADY_REACHED' | 'CAN_ONLY_ADD_TO_GROUP_CHAT' | 'USER_COULD_NOT_BE_ADDED'
export async function addUserToChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<number[], AddUserToChatError>> {
  const query = `SELECT chats.group_chat, array_agg(users_to_chats.userid) as userids FROM chats 
    JOIN users_to_chats ON chats.id = users_to_chats.chatid WHERE chats.id = $1 GROUP BY chats.id;`
  const res = await pgPool.query<{ group_chat: boolean; userids: number[] }>(query, [chatid])
  if (res.rows.length !== 1) {
    return err('CHAT_NOT_FOUND')
  }
  if (!res.rows[0].group_chat) {
    return err('CAN_ONLY_ADD_TO_GROUP_CHAT')
  }
  if (res.rows[0].userids.length >= maxUsersInChat - 1) {
    return err('USER_LIMIT_IS_ALREADY_REACHED')
  }

  try {
    await pgPool.query('INSERT INTO users_to_chats (userid, chatid) VALUES ($1, $2) RETURNING *;', [userid, chatid])
  } catch {
    return err('USER_COULD_NOT_BE_ADDED')
  }
  return ok(res.rows[0].userids.concat(userid))
}

export type LeaveChatError = 'CHAT_COULD_NOT_BE_LEFT'
export async function leaveChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<null, LeaveChatError>> {
  const res = await pgPool.query('DELETE FROM users_to_chats WHERE userid = $1 AND chatid = $2 RETURNING *;', [userid, chatid])
  if (res.rows.length !== 1) {
    return err('CHAT_COULD_NOT_BE_LEFT')
  }
  return ok(null)
}

export type InsertChatMessageError = 'SENDER_IS_NOT_PART_OF_CHAT'
export async function insertChatMessage(pgPool: pg.Pool, senderUserId: number, chatid: number, body: string): Promise<Result<number[], InsertChatMessageError>> {
  const usersInChat = await getUsersInChat(pgPool, chatid)
  if (usersInChat.every((userid) => userid !== senderUserId)) {
    return err('SENDER_IS_NOT_PART_OF_CHAT')
  }

  const query = `WITH
    inserted_message (id) AS ( INSERT INTO chat_messages (sender, chatid, body) VALUES ($1, $2, $3) RETURNING id ),
    users_with_unread (users_to_chats_id) AS (
      INSERT INTO chat_messages_unread (users_to_chats_id, messageid) SELECT id as users_to_chats_id, (SELECT id FROM inserted_message) as messageid FROM users_to_chats 
      WHERE userid != $1 AND chatid = $2 RETURNING users_to_chats_id
    )
    SELECT userid FROM users_with_unread JOIN users_to_chats ON users_to_chats.id = users_with_unread.users_to_chats_id;`
  const res = await pgPool.query<{ userid: number }>(query, [senderUserId, chatid, body])

  return ok(res.rows.map((r) => r.userid))
}

export async function markChatAsRead(pgPool: pg.Pool, userid: number, chatid: number): Promise<void> {
  const query = `DELETE FROM chat_messages_unread USING users_to_chats 
    WHERE chat_messages_unread.users_to_chats_id = users_to_chats.id AND users_to_chats.userid = $1 AND users_to_chats.chatid = $2;`
  await pgPool.query(query, [userid, chatid])
}

export type LoadChatError = 'USER_NOT_PART_OF_CHAT'
export async function loadChat(pgPool: pg.Pool, userid: number, chatid: number): Promise<Result<ChatMessage[], LoadChatError>> {
  const usersInChat = await getUsersInChat(pgPool, chatid)
  if (!usersInChat.includes(userid)) {
    return err('USER_NOT_PART_OF_CHAT')
  }

  const res = await pgPool.query<{ id: number; body: string; created: any; sender: string | null }>(
    `SELECT * FROM (
      SELECT
        chat_messages.id, chat_messages.body, chat_messages.created, users.username as sender
      FROM chat_messages 
        LEFT JOIN users ON users.id = chat_messages.sender
      WHERE chat_messages.chatid=$1 ORDER BY id DESC LIMIT 200
    ) sub ORDER BY id ASC;`,
    [chatid]
  )

  return ok(res.rows)
}

export async function loadChatOverview(pgPool: pg.Pool, userid: number): Promise<ChatElement[]> {
  const query = `WITH
      chatids (id) AS ( SELECT chatid FROM users_to_chats WHERE userid=$1 )
    SELECT 
    (SELECT created FROM chat_messages WHERE chatid=chatids.id ORDER BY id DESC LIMIT 1) as last_message,
        chatids.id as chatid, group_chat, group_name, created,
        (SELECT array_agg(users.username) FROM users_to_chats 
          JOIN users ON users_to_chats.userid = users.id WHERE chatid = chatids.id AND users_to_chats.userid != $1 GROUP BY chatid) as players,
        (SELECT COUNT(*)::INT FROM chat_messages_unread 
          JOIN users_to_chats ON chat_messages_unread.users_to_chats_id = users_to_chats.id WHERE userid=$1 AND chatid = chatids.id) as number_of_unread
    FROM chatids JOIN chats ON chatids.id = chats.id;`
  const res = await pgPool.query<{ last_message: string; chatid: number; group_chat: boolean; group_name: string; created: string; players: string[]; number_of_unread: number }>(
    query,
    [userid]
  )

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

export async function notifyUsersOfMissedMessages(pgPool: pg.Pool) {
  const res = await pgPool.query<{ username: string; email: string; locale: string }>(`
  SELECT DISTINCT ON (users.username) users.username, users.email, users.locale FROM chat_messages_unread 
  JOIN chat_messages ON chat_messages.id = chat_messages_unread.messageid 
    AND current_timestamp - chat_messages.created > interval'1 day' AND current_timestamp - chat_messages.created < interval'2 day'
  JOIN users_to_chats ON users_to_chats.id = chat_messages_unread.users_to_chats_id
  JOIN users ON users.id = users_to_chats.userid;`)

  for (const entry of res.rows) {
    await sendUnreadMessagesReminder(entry)
  }
}
