import type pg from 'pg'
import type { ChatMessagePage } from '../sharedTypes/chat'

import { messageRetention, numberOfMessagesPerLoad } from '../sharedDefinitions/chat'
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

/** Deletes all channel messages that are older than the retention period. */
export async function deleteOldChannelMessages(pgPool: pg.Pool) {
  const res = await pgPool.query(`DELETE FROM channel_messages WHERE created < current_timestamp - $1::interval;`, [messageRetention])
  return res.rowCount ?? 0
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

/** A game channel may only be written in by the players of that game, spectators may only read it.
 * A rematch lobby chats in the channel of the finished game, so its players may write there as well. */
export async function isPlayerOfGameChannel(pgPool: pg.Pool, gameID: number, userID: number) {
  const res = await pgPool.query(
    `SELECT 1 FROM users_to_games JOIN games ON games.id = users_to_games.gameid
      WHERE users_to_games.gameid = $1 AND users_to_games.userid = $2 AND users_to_games.player_index < games.n_players
    UNION ALL
    SELECT 1 FROM waitinggames WHERE gameid = $1 AND $2 IN (player0, player1, player2, player3, player4, player5);`,
    [gameID, userID]
  )
  return res.rows.length > 0
}
