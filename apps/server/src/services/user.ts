import type pg from 'pg'
import type { Friend } from '../sharedTypes/typesFriends'
import { randomUUID, randomBytes } from 'node:crypto'
import type { UserIdentifier, User } from '../sharedTypes/typesDBuser'
import { Result, err, ok } from 'neverthrow'
import { expectOneChangeInDatabase } from '../dbUtils/dbHelpers'
import { deletePlayerFromTournament } from './tournamentsPrivate'
import { sendPasswordReset } from '../communicationUtils/email'
import logger from '../helpers/logger'

export function resolveUserIdentifier(identifier: UserIdentifier, insertionIndex?: number): { key: string; sql: string; value: number | string } {
  if (identifier.id != null) {
    return { key: 'id', value: identifier.id, sql: `id = $${insertionIndex}` }
  } else if (identifier.username != null) {
    return { key: 'username', value: identifier.username, sql: `username = $${insertionIndex}` }
  }
  return { key: 'email', value: identifier.email ?? '', sql: `LOWER(email) = LOWER($${insertionIndex})` }
}

export type GetUserErrors = 'USER_NOT_FOUND_IN_DB'
export async function getUser(sqlClient: pg.Pool, identifier: UserIdentifier): Promise<Result<User, GetUserErrors>> {
  const queryIdent = resolveUserIdentifier(identifier, 1)
  const query = `SELECT id, email, username, password, token, activated, locale, color_blindness_flag, lastlogin, registered, user_description, game_default_position, admin,
  	(SELECT MAX(m.blockeduntil) FROM moderation m WHERE (m.userid = users.id OR m.email = users.email) AND m.blockeduntil > NOW()) AS blockedByModerationUntil, prefers_dark_mode
  FROM users WHERE ${queryIdent.sql};`
  const res = await sqlClient.query(query, [queryIdent.value])
  if (res.rowCount !== 1) {
    return err('USER_NOT_FOUND_IN_DB')
  }
  return ok({
    id: res.rows[0].id,
    email: res.rows[0].email,
    username: res.rows[0].username,
    password: res.rows[0].password,
    token: res.rows[0].token,
    activated: res.rows[0].activated,
    locale: res.rows[0].locale,
    colorBlindnessFlag: res.rows[0].color_blindness_flag,
    registered: res.rows[0].registered,
    lastlogin: res.rows[0].lastlogin,
    userDescription: res.rows[0].user_description,
    gameDefaultPositions: res.rows[0].game_default_position,
    admin: res.rows[0].admin,
    blockedByModerationUntil: res.rows[0].blockedbymoderationuntil,
    prefersDarkMode: res.rows[0].prefers_dark_mode,
  })
}

export async function changeMail(sqlClient: pg.Pool, userID: number, email: string): Promise<string> {
  const validationToken = randomUUID()
  const res = await sqlClient.query('UPDATE users SET email = $1, activated = false, token = $2  WHERE id = $3', [email, validationToken, userID])
  expectOneChangeInDatabase(res)
  return validationToken
}

export async function changeUsername(sqlClient: pg.Pool, userID: number, newUsername: string): Promise<void> {
  const res = await sqlClient.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userID])
  expectOneChangeInDatabase(res)
}

export async function changePassword(sqlClient: pg.Pool, userID: number, passwordHash: string): Promise<void> {
  const res = await sqlClient.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, userID])
  expectOneChangeInDatabase(res)
}

export async function disablePasswordResetRequestsOfUser(pgPool: pg.Pool, userid: number) {
  await pgPool.query('UPDATE password_reset_requests SET valid=FALSE WHERE userid=$1;', [userid])
  return true
}

export async function requestPasswordReset(pgPool: pg.Pool, user: User): Promise<Result<boolean, 'COULD_NOT_GENERATE_OR_SEND_TOKEN'>> {
  const token = randomBytes(32).toString('hex')
  try {
    await pgPool.query('INSERT INTO password_reset_requests (token, userid) VALUES ($1, $2);', [token, user.id])
    await sendPasswordReset({ user, token })
    return ok(true)
  } catch (error) {
    logger.error(error)
    return err('COULD_NOT_GENERATE_OR_SEND_TOKEN')
  }
}

export type setNewPasswordError = 'CHANGE_REQUEST_NOT_FOUND' | 'CHANGE_REQUEST_NOT_VALID' | 'COULD_NOT_CHANGE_PASSWORD'
export async function applyPasswordReset(pgPool: pg.Pool, token: string, passwordHash: string): Promise<Result<boolean, setNewPasswordError>> {
  const res = await pgPool.query<{ userid: number; valid: boolean; age_in_s: number }>(
    'SELECT userid, valid, ROUND(Extract(epoch FROM (current_timestamp - time_of_request))) as age_in_s FROM password_reset_requests WHERE token = $1;',
    [token]
  )

  const request = res.rows.at(0)
  if (request == null) return err('CHANGE_REQUEST_NOT_FOUND')
  if (!request.valid) return err('CHANGE_REQUEST_NOT_VALID')

  if (request.age_in_s > 15 * 60) {
    await pgPool.query('UPDATE password_reset_requests SET valid=FALSE WHERE token=$1;', [token])
    return err('CHANGE_REQUEST_NOT_VALID')
  }

  try {
    await pgPool.query('UPDATE password_reset_requests SET valid=FALSE WHERE userid=$1;', [request.userid])
    await changePassword(pgPool, request.userid, passwordHash)
  } catch (error) {
    return err('COULD_NOT_CHANGE_PASSWORD')
  }

  return ok(true)
}

export async function isUsernameFree(sqlClient: pg.Pool, username: string) {
  const query = 'SELECT id FROM users WHERE LOWER(username) = LOWER($1);'
  return sqlClient.query(query, [username]).then((res) => res.rowCount === 0)
}

export async function isEmailFree(sqlClient: pg.Pool, email: string) {
  const query = 'SELECT id FROM users WHERE LOWER(email) = LOWER($1);'
  return sqlClient.query(query, [email]).then((res) => res.rowCount === 0)
}

export async function updateUsersLastLogin(sqlClient: pg.Pool, username: string): Promise<void> {
  const res = await sqlClient.query('UPDATE users SET lastLogin = current_timestamp WHERE username=$1', [username])
  expectOneChangeInDatabase(res)
}

export async function signUpUser(sqlClient: pg.Pool, username: string, email: string, password: string, locale: string): Promise<User> {
  const validationToken = randomUUID()
  const query = 'INSERT INTO users (username, email, password, token, locale) VALUES ($1, $2, $3, $4, $5) RETURNING *'
  const values = [username, email, password, validationToken, locale]
  return sqlClient.query(query, values).then((res) => {
    return {
      id: res.rows[0].id,
      email: res.rows[0].email,
      username: res.rows[0].username,
      password: res.rows[0].password,
      token: res.rows[0].token,
      activated: res.rows[0].activated,
      locale: res.rows[0].locale,
      colorBlindnessFlag: res.rows[0].color_blindness_flag,
      registered: res.rows[0].registered,
      lastlogin: res.rows[0].lastlogin,
      userDescription: res.rows[0].user_description,
      gameDefaultPositions: res.rows[0].game_default_position,
      admin: res.rows[0].admin,
      blockedByModerationUntil: null,
      prefersDarkMode: null,
    }
  })
}

export async function getFriendships(sqlClient: pg.Pool, userID: number): Promise<Friend[]> {
  return sqlClient
    .query<{ date: string; username: string; status: 'to' | 'from' | 'done' }>(
      `
        SELECT t.date, users.username, t.status FROM (
            SELECT
                friendships.date,
                CASE WHEN friendships.userid1 = users.id THEN friendships.userid2 ELSE friendships.userid1 END as userid,
                CASE WHEN friendships.pending_user = users.id THEN 'from' WHEN friendships.pending_user IS NULL THEN 'done' ELSE 'to' END as status
            FROM users LEFT JOIN friendships ON users.id = friendships.userid1 OR users.id = friendships.userid2 WHERE users.id=$1
        ) AS t JOIN users ON t.userid = users.id;`,
      [userID]
    )
    .then((res) => res.rows)
}

export async function addFriendshipRequest(sqlClient: pg.Pool, useridFrom: number, useridTo: number): Promise<void> {
  const values = useridFrom > useridTo ? [useridTo, useridFrom, useridTo] : [useridFrom, useridTo, useridTo]
  await sqlClient.query('INSERT INTO friendships (userid1, userid2, pending_user) VALUES ($1, $2, $3);', values)
}

export async function confirmFriendshipRequest(sqlClient: pg.Pool, userToConfirm: number, userThatRequested: number): Promise<void> {
  const values = userToConfirm > userThatRequested ? [userThatRequested, userToConfirm] : [userToConfirm, userThatRequested]
  values.push(userToConfirm)
  const res = await sqlClient.query('UPDATE friendships SET pending_user = NULL, date=current_timestamp WHERE userid1 = $1 AND userid2 = $2 AND pending_user = $3;', values)
  expectOneChangeInDatabase(res)
}

export async function cancelFriendship(sqlClient: pg.Pool, userid1: number, userid2: number): Promise<number | null> {
  const values = userid1 > userid2 ? [userid2, userid1] : [userid1, userid2]
  const res = await sqlClient.query('DELETE FROM friendships WHERE userid1 = $1 AND userid2 = $2 RETURNING pending_user;', values)
  expectOneChangeInDatabase(res)
  return res.rows[0].pending_user
}

export async function editUserDescription(sqlClient: pg.Pool, userID: number, text: string): Promise<void> {
  const res = await sqlClient.query('UPDATE users SET user_description=$1 WHERE id=$2;', [text, userID])
  expectOneChangeInDatabase(res)
}

export type DeleteUserError = null
export async function deleteUser(sqlClient: pg.Pool, userID: number): Promise<Result<null, DeleteUserError>> {
  await sqlClient.query('DELETE FROM users_to_tournaments WHERE userid = $1;', [userID])
  await sqlClient.query('DELETE FROM tournaments_register WHERE userid = $1;', [userID])

  await deletePlayerFromTournament(sqlClient, userID)

  await sqlClient.query('DELETE FROM hof WHERE userid = $1;', [userID])

  await sqlClient.query('DELETE FROM friendships WHERE userid1 = $1 OR userid2 = $1;', [userID])

  let queries: string[] = []
  queries.push('DELETE FROM users_to_games WHERE userid=$1;')
  for (const query of queries) {
    await sqlClient.query(query, [userID])
  }

  queries = ['DELETE FROM games WHERE id IN (SELECT games.id as id FROM games LEFT JOIN users_to_games ON games.id = users_to_games.gameid WHERE users_to_games.userid IS NULL);']
  for (const query of queries) {
    await sqlClient.query(query)
  }

  await sqlClient.query('DELETE FROM users WHERE id = $1;', [userID])

  return ok(null)
}
