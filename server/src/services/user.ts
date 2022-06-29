import pg from 'pg'
import { friend } from '../../../shared/types/typesFriends';
import { v4 as uuidv4 } from 'uuid';
import { userIdentifier, user } from '../../../shared/types/typesDBuser'
import { getSubscription, cancelSubscription, getSubscriptionError, cancelSubscriptionError } from '../paypal/paypal';
import { Result, err, ok } from 'neverthrow';
import { expectOneChangeInDatabase } from '../dbUtils/dbHelpers';
import { deletePlayerFromTournament } from './tournamentsPrivate';

export function resolveUserIdentifier(identifier: userIdentifier, insertionIndex?: number): { key: string, sql: string, value: number | string } {
    if (identifier.id != null) { return { key: 'id', value: identifier.id, sql: `id = $${insertionIndex}` } }
    else if (identifier.username != null) { return { key: 'username', value: identifier.username, sql: `username = $${insertionIndex}` } }
    return { key: 'email', value: identifier.email ?? '', sql: `LOWER(email) = LOWER($${insertionIndex})` }
}

export type GetUserErrors = 'USER_NOT_FOUND_IN_DB'
export async function getUser(sqlClient: pg.Pool, identifier: userIdentifier): Promise<Result<user, GetUserErrors>> {
    const queryIdent = resolveUserIdentifier(identifier, 1)

    const res = await sqlClient.query(`SELECT id, email, username, password, token, activated, locale, color_blindness_flag, lastlogin, registered, user_description, game_default_position FROM users WHERE ${queryIdent.sql};`, [queryIdent.value])
    if (res.rowCount != 1) { return err('USER_NOT_FOUND_IN_DB') }
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
    })
}

export async function changeMail(sqlClient: pg.Pool, userID: number, email: string): Promise<string> {
    const validationToken = uuidv4().toString()
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

export async function isUsernameFree(sqlClient: pg.Pool, username: string) {
    const query = 'SELECT id FROM users WHERE LOWER(username) = LOWER($1);';
    return sqlClient.query(query, [username]).then((res) => res.rowCount === 0)
}

export async function isEmailFree(sqlClient: pg.Pool, email: string) {
    const query = 'SELECT id FROM users WHERE LOWER(email) = LOWER($1);';
    return sqlClient.query(query, [email]).then((res) => res.rowCount === 0)
}

export async function updateUsersLastLogin(sqlClient: pg.Pool, username: string): Promise<void> {
    const res = await sqlClient.query('UPDATE users SET lastLogin = current_timestamp WHERE username=$1', [username])
    expectOneChangeInDatabase(res)
}

export async function signUpUser(sqlClient: pg.Pool, username: string, email: string, password: string, locale: string): Promise<user> {
    const validationToken = uuidv4().toString()
    const query = 'INSERT INTO users (username, email, password, token, locale) VALUES ($1, $2, $3, $4, $5) RETURNING *';
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
        }
    })
}

export async function getFriendships(sqlClient: pg.Pool, userID: number): Promise<friend[]> {
    return sqlClient.query<{ date: string, username: string, status: 'to' | 'from' | 'done' }>(`
        SELECT t.date, users.username, t.status FROM (
            SELECT
                friendships.date,
                CASE WHEN friendships.userid1 = users.id THEN friendships.userid2 ELSE friendships.userid1 END as userid,
                CASE WHEN friendships.pending_user = users.id THEN 'from' WHEN friendships.pending_user IS NULL THEN 'done' ELSE 'to' END as status
            FROM users LEFT JOIN friendships ON users.id = friendships.userid1 OR users.id = friendships.userid2 WHERE users.id=$1
        ) AS t JOIN users ON t.userid = users.id;`, [userID]).then((res) => res.rows)
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

export type deleteUserError = getSubscriptionError | cancelSubscriptionError
export async function deleteUser(sqlClient: pg.Pool, userID: number): Promise<Result<null, deleteUserError>> {
    const sub = await getSubscription(sqlClient, userID);
    if (sub.isErr()) { return err(sub.error) }

    if (sub.value.status === 'running') {
        const cancelRes = await cancelSubscription(sqlClient, userID);
        if (cancelRes.isErr()) { return err(cancelRes.error) }
    }

    await sqlClient.query('UPDATE users SET currentsubscription = NULL WHERE id = $1;', [userID])
    await sqlClient.query('DELETE FROM subscriptions WHERE userid = $1;', [userID])

    await sqlClient.query('DELETE FROM users_to_tournaments WHERE userid = $1;', [userID])
    await sqlClient.query('DELETE FROM tournaments_register WHERE userid = $1;', [userID])

    await deletePlayerFromTournament(sqlClient, userID)

    await sqlClient.query('DELETE FROM hof WHERE userid = $1;', [userID])

    await sqlClient.query('DELETE FROM friendships WHERE userid1 = $1 OR userid2 = $1;', [userID])

    let queries: string[] = [];
    queries.push('DELETE FROM users_to_games WHERE userid=$1;');
    for (const query of queries) {
        await sqlClient.query(query, [userID])
    }

    queries = ['DELETE FROM games WHERE id IN (SELECT games.id as id FROM games LEFT JOIN users_to_games ON games.id = users_to_games.gameid WHERE users_to_games.userid IS NULL);'];
    for (const query of queries) {
        await sqlClient.query(query)
    }

    await sqlClient.query('DELETE FROM users WHERE id = $1;', [userID])

    return ok(null)
}
