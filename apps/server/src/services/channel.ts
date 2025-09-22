import type pg from 'pg'
import type { ChatMessage } from '../sharedTypes/chat'

export async function getChannelMessages(pgPool: pg.Pool, channel: string): Promise<ChatMessage[]> {
  const res = await pgPool.query<{ id: number; body: string; created: string; sender: string }>(
    `SELECT * FROM (
      SELECT channel_messages.id, users.username as sender, channel_messages.body, channel_messages.created FROM channel_messages 
      JOIN users ON channel_messages.sender = users.id 
      WHERE channel = $1 AND (channel_messages.channel != 'general' OR current_timestamp - channel_messages.created < interval '2 hours') ORDER BY id DESC LIMIT 200
    ) sub ORDER BY id ASC;`,
    [channel]
  )
  return res.rows
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
