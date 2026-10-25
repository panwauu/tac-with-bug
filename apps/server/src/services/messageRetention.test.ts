import { deleteOldChatMessages } from './chat'
import { deleteOldChannelMessages } from './channel'
import { messageRetention } from '../sharedDefinitions/chat'

const USER = 1
const CHANNEL = 'retention-test'

// A message that is `daysBeyondRetention` days older than the retention period. A negative value
// keeps the message inside the period, which must not be deleted.
async function insertChatMessage(chatid: number, body: string, daysBeyondRetention: number) {
  const res = await testServer.pgPool.query<{ id: number }>(
    `INSERT INTO chat_messages (sender, chatid, body, created) 
      VALUES ($1, $2, $3, current_timestamp - $4::interval - make_interval(days => $5)) RETURNING id;`,
    [USER, chatid, body, messageRetention, daysBeyondRetention]
  )
  return res.rows[0].id
}

async function insertChannelMessage(body: string, daysBeyondRetention: number) {
  const res = await testServer.pgPool.query<{ id: number }>(
    `INSERT INTO channel_messages (sender, channel, body, created) 
      VALUES ($1, $2, $3, current_timestamp - $4::interval - make_interval(days => $5)) RETURNING id;`,
    [USER, CHANNEL, body, messageRetention, daysBeyondRetention]
  )
  return res.rows[0].id
}

async function messageExists(table: 'chat_messages' | 'channel_messages', id: number) {
  const res = await testServer.pgPool.query(`SELECT id FROM ${table} WHERE id = $1;`, [id])
  return res.rows.length === 1
}

describe('Deletion of old messages', () => {
  let chatid: number
  let oldChatMessage: number, youngChatMessage: number
  let oldChannelMessage: number, youngChannelMessage: number

  beforeAll(async () => {
    const chatRes = await testServer.pgPool.query<{ id: number }>('INSERT INTO chats (group_chat, group_name) VALUES (TRUE, $1) RETURNING id;', ['retentionTest'])
    chatid = chatRes.rows[0].id

    oldChatMessage = await insertChatMessage(chatid, 'old', 1)
    // Only just inside the retention period: an interval comparison would normalize a month to
    // 30 days and delete this message, as it is already older than 360 days
    youngChatMessage = await insertChatMessage(chatid, 'young', -1)
    oldChannelMessage = await insertChannelMessage('old', 1)
    youngChannelMessage = await insertChannelMessage('young', -1)
  })

  test('Should delete chat messages older than the retention period only', async () => {
    const nDeleted = await deleteOldChatMessages(testServer.pgPool)
    expect(nDeleted).toBeGreaterThanOrEqual(1)
    expect(nDeleted).toBeGreaterThanOrEqual(1)

    expect(await messageExists('chat_messages', oldChatMessage)).toBe(false)
    expect(await messageExists('chat_messages', youngChatMessage)).toBe(true)
  })

  test('Should delete channel messages older than the retention period only', async () => {
    const nDeleted = await deleteOldChannelMessages(testServer.pgPool)
    expect(nDeleted).toBeGreaterThanOrEqual(1)

    expect(await messageExists('channel_messages', oldChannelMessage)).toBe(false)
    expect(await messageExists('channel_messages', youngChannelMessage)).toBe(true)
  })

  test('Should delete nothing if no message is too old', async () => {
    expect(await deleteOldChatMessages(testServer.pgPool)).toBe(0)
    expect(await deleteOldChannelMessages(testServer.pgPool)).toBe(0)
  })
})
