import { deleteOldLogs, deleteOldModerationData, deleteOldPasswordResetRequests } from './dataRetention'
import { logRetention, moderationRetention, passwordResetValidityInSeconds } from '../sharedDefinitions/dataRetention'

// Every test file has its own database (setupTestEnvironment.ts), so the seed data of other tests is not affected

async function exists(table: string, column: string, value: string | number) {
  const res = await testServer.pgPool.query(`SELECT 1 FROM ${table} WHERE ${column} = $1;`, [value])
  return res.rows.length === 1
}

describe('Deletion of old logs', () => {
  // `daysBeyondRetention` days older than the retention period; a negative value keeps the entry inside it
  async function insertLog(message: string, daysBeyondRetention: number) {
    await testServer.pgPool.query(`INSERT INTO logs (level, message, timestamp) VALUES ('info', $1, current_timestamp - $2::interval - make_interval(days => $3));`, [
      message,
      logRetention,
      daysBeyondRetention,
    ])
  }

  test('Should delete log entries older than the retention period only', async () => {
    await insertLog('retention-old', 1)
    await insertLog('retention-young', -1)

    expect(await deleteOldLogs(testServer.pgPool)).toBeGreaterThanOrEqual(1)
    expect(await exists('logs', 'message', 'retention-old')).toBe(false)
    expect(await exists('logs', 'message', 'retention-young')).toBe(true)
    expect(await deleteOldLogs(testServer.pgPool)).toBe(0)
  })
})

describe('Deletion of password reset requests', () => {
  async function insertRequest(token: string, valid: boolean, ageInSeconds: number) {
    await testServer.pgPool.query(
      'INSERT INTO password_reset_requests (token, userid, valid, time_of_request) VALUES ($1, 1, $2, current_timestamp - make_interval(secs => $3));',
      [token.padEnd(64, '0'), valid, ageInSeconds]
    )
    return token.padEnd(64, '0')
  }

  test('Should delete used and expired requests and keep the usable ones', async () => {
    const usable = await insertRequest('usable', true, passwordResetValidityInSeconds - 60)
    const expired = await insertRequest('expired', true, passwordResetValidityInSeconds + 60)
    const used = await insertRequest('used', false, 60)

    expect(await deleteOldPasswordResetRequests(testServer.pgPool)).toBe(2)
    expect(await exists('password_reset_requests', 'token', usable)).toBe(true)
    expect(await exists('password_reset_requests', 'token', expired)).toBe(false)
    expect(await exists('password_reset_requests', 'token', used)).toBe(false)
  })
})

describe('Deletion of old moderation data', () => {
  // `daysBeyondRetention` days after the end of the retention period; a negative value is inside it
  async function insertBlock(reason: string, daysBeyondRetention: number) {
    await testServer.pgPool.query(
      `INSERT INTO moderation (userid, email, reason, insertedbyuserid, blockeduntil)
        VALUES (2, 'retention@fake-mail.de', $1, 1, current_timestamp - $2::interval - make_interval(days => $3));`,
      [reason, moderationRetention, daysBeyondRetention]
    )
  }

  async function insertReport(body: string, daysBeyondRetention: number | null) {
    await testServer.pgPool.query(
      `INSERT INTO reports (reporterid, userid, category, body, handled)
        VALUES (1, 2, 'chat', $1, CASE WHEN $3::int IS NULL THEN NULL ELSE current_timestamp - $2::interval - make_interval(days => $3::int) END);`,
      [body, moderationRetention, daysBeyondRetention]
    )
  }

  test('Should delete old blocks and old handled reports only', async () => {
    await insertBlock('retention-old', 1)
    await insertBlock('retention-young', -1)
    await testServer.pgPool.query(
      `INSERT INTO moderation (userid, email, reason, insertedbyuserid, blockeduntil) VALUES (2, NULL, 'retention-running', 1, current_timestamp + interval '1 day');`
    )
    await insertReport('retention-old', 1)
    await insertReport('retention-young', -1)
    await insertReport('retention-open', null)

    const deleted = await deleteOldModerationData(testServer.pgPool)
    // The seed data also contains blocks that ended long ago
    expect(deleted.blocks).toBeGreaterThanOrEqual(1)
    expect(deleted.reports).toBe(1)

    expect(await exists('moderation', 'reason', 'retention-old')).toBe(false)
    expect(await exists('moderation', 'reason', 'retention-young')).toBe(true)
    expect(await exists('moderation', 'reason', 'retention-running')).toBe(true)
    expect(await exists('reports', 'body', 'retention-old')).toBe(false)
    expect(await exists('reports', 'body', 'retention-young')).toBe(true)
    expect(await exists('reports', 'body', 'retention-open')).toBe(true)
  })
})
