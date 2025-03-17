import type pg from 'pg'
import type { ModerationData, UserIdentifier } from '../sharedTypes/typesDBuser'
import { Result, err, ok } from 'neverthrow'

export function resolveUserIdentifier(identifier: UserIdentifier, insertionIndex?: number): { key: string; sql: string; value: number | string } {
  if (identifier.id != null) {
    return { key: 'id', value: identifier.id, sql: `userid = $${insertionIndex}` }
  }
  return { key: 'email', value: identifier.email ?? '', sql: `LOWER(email) = LOWER($${insertionIndex})` }
}

export async function getModerationData(sqlClient: pg.Pool, identifier?: UserIdentifier): Promise<ModerationData[]> {
  const queryIdent = identifier != null ? resolveUserIdentifier(identifier, 1) : { sql: '$1=1', value: 1 }
  const query = `SELECT * FROM moderation WHERE ${queryIdent.sql};`
  const res = await sqlClient.query(query, [queryIdent.value])
  return res.rows.map((row) => {
    return {
      id: row.id,
      email: row.email,
      userid: row.userid,
      blockeduntil: row.blockeduntil,
      reason: row.reason,
      insertedByUserId: row.insertedbyuserid,
    }
  })
}

export async function setModerationData(
  sqlClient: pg.Pool,
  userID: number,
  email: string,
  reason: string,
  validUntil: string,
  insertedByUserId: number
): Promise<Result<ModerationData, 'COULD_NOT_INSERT'>> {
  const result = await sqlClient.query(`INSERT INTO moderation (userid, email, blockeduntil, reason, insertedbyuserid) VALUES ($1, $2, $3, $4, $5) RETURNING *;`, [
    userID,
    email,
    validUntil,
    reason,
    insertedByUserId,
  ])

  if (result.rowCount !== 1) {
    return err('COULD_NOT_INSERT')
  }

  return ok({
    id: result.rows[0].id,
    email: result.rows[0].email,
    userid: result.rows[0].userid,
    blockeduntil: result.rows[0].blockeduntil,
    reason: result.rows[0].reason,
    insertedByUserId: result.rows[0].insertedbyuserid,
  })
}

export async function resetModerationDataOfUser(sqlClient: pg.Pool, userID: number): Promise<ModerationData[]> {
  const res = await sqlClient.query(`UPDATE moderation SET blockeduntil = NOW() WHERE userid=$1 AND blockeduntil > NOW() RETURNING *;`, [userID])

  return res.rows.map((row) => {
    return {
      id: row.id,
      email: row.email,
      userid: row.userid,
      blockeduntil: row.blockeduntil,
      reason: row.reason,
      insertedByUserId: row.insertedbyuserid,
    }
  })
}
