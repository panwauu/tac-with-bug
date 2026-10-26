import type pg from 'pg'
import { Result, err, ok } from 'neverthrow'
import type { ReportCategory, ReportedUser } from '../sharedTypes/typesReports'
import { autoBlockDurationHours, autoBlockReporters, autoBlockWindow, automaticModeratorID } from '../sharedDefinitions/reports'
import { editUserDescription, getUser } from './user'
import { resetModerationDataOfUser, setModerationData } from './moderation'
import { selectRandomProfilePicture } from './picture'

/** Moderators handle reports and block users; admins can do everything moderators can. */
export async function isModerator(pgPool: pg.Pool, userID: number): Promise<boolean> {
  const res = await pgPool.query<{ admin: boolean; moderator: boolean }>('SELECT admin, moderator FROM users WHERE id = $1;', [userID])
  return res.rowCount === 1 && (res.rows[0].admin || res.rows[0].moderator)
}

export type AddReportError = 'USER_NOT_FOUND' | 'SELF_REPORT' | 'ALREADY_REPORTED'

/**
 * Stores a report. A reporter can have only one open report per user. When enough different users
 * report the same user within the window, that user is blocked automatically for a short time.
 */
export async function addReport(
  pgPool: pg.Pool,
  reporterID: number,
  username: string,
  category: ReportCategory,
  body: string
): Promise<Result<{ userID: number; autoBlocked: boolean }, AddReportError>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')
  if (user.value.id === reporterID) return err('SELF_REPORT')

  const open = await pgPool.query('SELECT 1 FROM reports WHERE reporterid = $1 AND userid = $2 AND handled IS NULL;', [reporterID, user.value.id])
  if ((open.rowCount ?? 0) > 0) return err('ALREADY_REPORTED')

  await pgPool.query('INSERT INTO reports (reporterid, userid, category, body) VALUES ($1, $2, $3, $4);', [reporterID, user.value.id, category, body])

  let autoBlocked = false
  if (user.value.blockedByModerationUntil == null) {
    const reporters = await pgPool.query<{ n: number }>(
      `SELECT COUNT(DISTINCT reporterid)::int AS n FROM reports WHERE userid = $1 AND handled IS NULL AND created > NOW() - interval '${autoBlockWindow}';`,
      [user.value.id]
    )
    if (reporters.rows[0].n >= autoBlockReporters) {
      const until = new Date(Date.now() + autoBlockDurationHours * 60 * 60 * 1000).toISOString()
      const res = await setModerationData(pgPool, user.value.id, user.value.email, `Automatic: ${autoBlockReporters} reports`, until, automaticModeratorID)
      autoBlocked = res.isOk()
    }
  }

  return ok({ userID: user.value.id, autoBlocked })
}

export async function countOpenReports(pgPool: pg.Pool): Promise<number> {
  const res = await pgPool.query<{ n: number }>('SELECT COUNT(DISTINCT userid)::int AS n FROM reports WHERE handled IS NULL;')
  return res.rows[0].n
}

/** All users with open reports, the most reported first. */
export async function getOpenReports(pgPool: pg.Pool): Promise<ReportedUser[]> {
  const res = await pgPool.query<{
    username: string
    user_description: string
    blockeduntil: string | null
    reports: { reporter: string | null; category: ReportCategory; body: string; created: string }[]
  }>(
    `SELECT u.username, u.user_description,
      (SELECT MAX(m.blockeduntil) FROM moderation m WHERE (m.userid = u.id OR m.email = u.email) AND m.blockeduntil > NOW()) AS blockeduntil,
      json_agg(json_build_object('reporter', r2.username, 'category', r.category, 'body', r.body, 'created', r.created) ORDER BY r.created DESC) AS reports
    FROM reports r
    JOIN users u ON u.id = r.userid
    LEFT JOIN users r2 ON r2.id = r.reporterid
    WHERE r.handled IS NULL
    GROUP BY u.id
    ORDER BY COUNT(*) DESC, MAX(r.created) DESC;`
  )
  return res.rows.map((row) => ({
    username: row.username,
    userDescription: row.user_description,
    blockedUntil: row.blockeduntil,
    reports: row.reports,
  }))
}

/** Marks all open reports of a user as handled. */
export async function closeReports(pgPool: pg.Pool, userID: number, moderatorID: number): Promise<void> {
  await pgPool.query('UPDATE reports SET handled = NOW(), handledbyuserid = $2 WHERE userid = $1 AND handled IS NULL;', [userID, moderatorID])
}

export type ModerationActionError = 'USER_NOT_FOUND' | 'COULD_NOT_BLOCK'

/**
 * Blocks a user for some days: no chat, no channel messages, no new picture or profile text.
 * Optionally resets picture and profile text. Closes the open reports of the user.
 */
export async function blockUser(
  pgPool: pg.Pool,
  moderatorID: number,
  username: string,
  days: number,
  reason: string,
  resetProfile: boolean
): Promise<Result<number, ModerationActionError>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')

  if (resetProfile) {
    await selectRandomProfilePicture(pgPool, user.value.id)
    await editUserDescription(pgPool, user.value.id, '')
  }

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const res = await setModerationData(pgPool, user.value.id, user.value.email, reason, until, moderatorID)
  if (res.isErr()) return err('COULD_NOT_BLOCK')

  await closeReports(pgPool, user.value.id, moderatorID)
  return ok(user.value.id)
}

/** Lifts all running blocks of a user and closes the open reports. */
export async function unblockUser(pgPool: pg.Pool, moderatorID: number, username: string): Promise<Result<number, ModerationActionError>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')
  await resetModerationDataOfUser(pgPool, user.value.id)
  await closeReports(pgPool, user.value.id, moderatorID)
  return ok(user.value.id)
}

/** Closes the open reports of a user without action. */
export async function dismissReports(pgPool: pg.Pool, moderatorID: number, username: string): Promise<Result<number, ModerationActionError>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')
  await closeReports(pgPool, user.value.id, moderatorID)
  return ok(user.value.id)
}

export async function getModerators(pgPool: pg.Pool): Promise<string[]> {
  const res = await pgPool.query<{ username: string }>('SELECT username FROM users WHERE moderator ORDER BY username;')
  return res.rows.map((r) => r.username)
}

export async function setModerator(pgPool: pg.Pool, username: string, moderator: boolean): Promise<Result<number, 'USER_NOT_FOUND'>> {
  const res = await pgPool.query<{ id: number }>('UPDATE users SET moderator = $2 WHERE username = $1 RETURNING id;', [username, moderator])
  if (res.rowCount !== 1) return err('USER_NOT_FOUND')
  return ok(res.rows[0].id)
}
