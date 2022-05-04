import pg from 'pg'
import { userIdentifier } from '../../../shared/types/typesDBuser'
import { resolveUserIdentifier } from './user';

export async function activateUser(sqlClient: pg.Pool, identifier: userIdentifier) {
    const userIdentifier = resolveUserIdentifier(identifier)
    return sqlClient.query(`UPDATE users SET activated = true WHERE ${userIdentifier.key} = $1;`, [userIdentifier.value])
}