import type pg from 'pg'
import { Result, err, ok } from 'neverthrow'
import type { BlockedUser, ModerationBlock, HandledReport, ReportCategory, ReportedMessageRef, ReportedUser, UserModerationHistory } from '../sharedTypes/typesReports'
import { editUserDescription, getUser } from './user'
import { resetModerationDataOfUser, setModerationData } from './moderation'
import { selectRandomProfilePicture } from './picture'

/** Moderators handle reports and block users; admins can do everything moderators can. */
export async function isModerator(pgPool: pg.Pool, userID: number): Promise<boolean> {
  const res = await pgPool.query<{ admin: boolean; moderator: boolean }>('SELECT admin, moderator FROM users WHERE id = $1;', [userID])
  return res.rowCount === 1 && (res.rows[0].admin || res.rows[0].moderator)
}

export type AddReportError = 'USER_NOT_FOUND' | 'SELF_REPORT' | 'ALREADY_REPORTED' | 'MESSAGE_NOT_FOUND'

/**
 * Looks up a reported message. It must be written by the reported user, and a private chat message must be in a
 * chat of the reporter: nobody can pull messages of chats they are not part of into a report.
 */
async function getReportedMessage(pgPool: pg.Pool, reporterID: number, userID: number, ref: ReportedMessageRef): Promise<{ body: string; created: string } | null> {
  const res =
    ref.type === 'channel'
      ? await pgPool.query<{ body: string; created: string }>('SELECT body, created FROM channel_messages WHERE id = $1 AND sender = $2;', [ref.id, userID])
      : await pgPool.query<{ body: string; created: string }>(
          `SELECT m.body, m.created FROM chat_messages m
          JOIN users_to_chats utc ON utc.chatid = m.chatid AND utc.userid = $3
          WHERE m.id = $1 AND m.sender = $2;`,
          [ref.id, userID, reporterID]
        )
  return res.rows[0] ?? null
}

/**
 * Stores a report. A reporter can have only one open report per user. Reports never block anybody
 * by themselves: a few accounts, or bots, could otherwise silence any player. Only moderators block.
 */
export async function addReport(
  pgPool: pg.Pool,
  reporterID: number,
  username: string,
  category: ReportCategory,
  body: string,
  messageRef?: ReportedMessageRef
): Promise<Result<number, AddReportError>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')
  if (user.value.id === reporterID) return err('SELF_REPORT')

  const message = messageRef != null ? await getReportedMessage(pgPool, reporterID, user.value.id, messageRef) : null
  if (messageRef != null && message == null) return err('MESSAGE_NOT_FOUND')

  const open = await pgPool.query('SELECT 1 FROM reports WHERE reporterid = $1 AND userid = $2 AND handled IS NULL;', [reporterID, user.value.id])
  if ((open.rowCount ?? 0) > 0) return err('ALREADY_REPORTED')

  await pgPool.query('INSERT INTO reports (reporterid, userid, category, body, message, message_created) VALUES ($1, $2, $3, $4, $5, $6);', [
    reporterID,
    user.value.id,
    category,
    body,
    message?.body ?? null,
    message?.created ?? null,
  ])

  return ok(user.value.id)
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
    reports: { reporter: string | null; category: ReportCategory; body: string; created: string; message: string | null; messageCreated: string | null }[]
  }>(
    `SELECT u.username, u.user_description,
      (SELECT MAX(m.blockeduntil) FROM moderation m WHERE (m.userid = u.id OR m.email = u.email) AND m.blockeduntil > NOW()) AS blockeduntil,
      json_agg(
        json_build_object('reporter', r2.username, 'category', r.category, 'body', r.body, 'created', r.created, 'message', r.message, 'messageCreated', r.message_created)
        ORDER BY r.created DESC
      ) AS reports
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

/** All users who are blocked at the moment, the longest block first. Blocks can also be stored by email only. */
export async function getBlockedUsers(pgPool: pg.Pool): Promise<BlockedUser[]> {
  const res = await pgPool.query<{ username: string; blockeduntil: string; reason: string | null; moderator: string | null }>(
    `SELECT * FROM (
      SELECT DISTINCT ON (u.id) u.username, m.blockeduntil, m.reason, u2.username AS moderator
      FROM moderation m
      JOIN users u ON (m.userid = u.id OR m.email = u.email)
      LEFT JOIN users u2 ON u2.id = m.insertedbyuserid
      WHERE m.blockeduntil > NOW()
      ORDER BY u.id, m.blockeduntil DESC
    ) b ORDER BY b.blockeduntil DESC;`
  )
  return res.rows.map((row) => ({ username: row.username, blockedUntil: row.blockeduntil, reason: row.reason, moderator: row.moderator }))
}

/** The whole moderation history of a user: current block, all blocks ever issued and all reports with their outcome. */
export async function getUserHistory(pgPool: pg.Pool, username: string): Promise<Result<UserModerationHistory, 'USER_NOT_FOUND'>> {
  const user = await getUser(pgPool, { username })
  if (user.isErr()) return err('USER_NOT_FOUND')

  const blocks = await pgPool.query<{ created: string; blockeduntil: string; reason: string | null; moderator: string | null }>(
    `SELECT m.created, m.blockeduntil, m.reason, u2.username AS moderator
    FROM moderation m
    LEFT JOIN users u2 ON u2.id = m.insertedbyuserid
    WHERE m.userid = $1 OR m.email = $2
    ORDER BY m.created DESC, m.id DESC;`,
    [user.value.id, user.value.email]
  )
  const reports = await pgPool.query<{
    reporter: string | null
    category: ReportCategory
    body: string
    created: string
    handled: string | null
    handledby: string | null
    message: string | null
    message_created: string | null
  }>(
    `SELECT r1.username AS reporter, r.category, r.body, r.created, r.handled, r2.username AS handledby, r.message, r.message_created
    FROM reports r
    LEFT JOIN users r1 ON r1.id = r.reporterid
    LEFT JOIN users r2 ON r2.id = r.handledbyuserid
    WHERE r.userid = $1
    ORDER BY r.created DESC;`,
    [user.value.id]
  )

  const now = Date.now()
  const running = blocks.rows.filter((b) => new Date(b.blockeduntil).getTime() > now).map((b) => b.blockeduntil)
  const blockedUntil = running.length === 0 ? null : running.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))

  return ok({
    username: user.value.username,
    blockedUntil,
    blocks: blocks.rows.map((b): ModerationBlock => ({ created: b.created, blockedUntil: b.blockeduntil, reason: b.reason, moderator: b.moderator })),
    reports: reports.rows.map((r): HandledReport => ({
      reporter: r.reporter,
      category: r.category,
      body: r.body,
      created: r.created,
      handled: r.handled,
      handledBy: r.handledby,
      message: r.message,
      messageCreated: r.message_created,
    })),
  })
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
