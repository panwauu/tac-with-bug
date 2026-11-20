import type pg from 'pg'
import { logRetention, moderationRetention, passwordResetValidityInSeconds } from '../sharedDefinitions/dataRetention'

// The timestamps are compared instead of the intervals, as an interval comparison would normalize a month
// to 30 days (see deleteOldChatMessages)

/** Deletes the entries of the application log that are older than the retention period. */
export async function deleteOldLogs(pgPool: pg.Pool): Promise<number> {
  const res = await pgPool.query('DELETE FROM logs WHERE timestamp < current_timestamp - $1::interval;', [logRetention])
  return res.rowCount ?? 0
}

/** Deletes password reset requests that can no longer be used: already used, replaced or expired. */
export async function deleteOldPasswordResetRequests(pgPool: pg.Pool): Promise<number> {
  const res = await pgPool.query('DELETE FROM password_reset_requests WHERE NOT valid OR time_of_request < current_timestamp - make_interval(secs => $1);', [
    passwordResetValidityInSeconds,
  ])
  return res.rowCount ?? 0
}

/**
 * Deletes blocks that ended longer ago than the retention period, together with the stored email address,
 * and reports that were handled longer ago. Running blocks and open reports are always kept.
 */
export async function deleteOldModerationData(pgPool: pg.Pool): Promise<{ blocks: number; reports: number }> {
  const blocks = await pgPool.query('DELETE FROM moderation WHERE blockeduntil < current_timestamp - $1::interval;', [moderationRetention])
  const reports = await pgPool.query('DELETE FROM reports WHERE handled < current_timestamp - $1::interval;', [moderationRetention])
  return { blocks: blocks.rowCount ?? 0, reports: reports.rowCount ?? 0 }
}
