import type pg from 'pg'
import type { ChatMessagePage } from '../sharedTypes/chat'

import { numberOfMessagesPerLoad } from '../sharedDefinitions/chat'
import { buildMessagePage } from './chatPagination'

/** Loads one page of messages. If `beforeMessageId` is given, only older messages are returned. */
export async function getChannelMessages(pgPool: pg.Pool, channel: string, beforeMessageId?: number): Promise<ChatMessagePage> {
  const res = await pgPool.query<{ id: number; body: string; created: string; sender: string }>(
    `SELECT * FROM (
      SELECT channel_messages.id, users.username as sender, channel_messages.body, channel_messages.created FROM channel_messages 
      JOIN users ON channel_messages.sender = users.id 
      WHERE channel = $1 AND ($2::INT IS NULL OR channel_messages.id < $2::INT)
        AND (channel_messages.channel != 'general' OR current_timestamp - channel_messages.created < interval '2 hours') ORDER BY id DESC LIMIT $3
    ) sub ORDER BY id ASC;`,
    [channel, beforeMessageId ?? null, numberOfMessagesPerLoad + 1]
  )
  return buildMessagePage(res.rows)
}

export async function addChannelMessage(pgPool: pg.Pool, userID: number, body: string, channel: string) {
  await pgPool.query('INSERT INTO channel_messages (sender, body, channel) VALUES ($1, $2, $3);', [userID, body, channel])
}

export async function transferLatestMessagesToOtherChannel(pgPool: pg.Pool, channelTo: string, channelFrom: string) {
  return pgPool.query(
    `INSERT INTO channel_messages (sender, body, created, channel)
        SELECT sender, body, created, $2 as channel  FROM 
            (SELECT * FROM channel_messages WHERE channel = $1 ORDER BY id DESC LIMIT 100 ) as s
        ORDER BY id ASC;`,
    [channelFrom, channelTo]
  )
}
