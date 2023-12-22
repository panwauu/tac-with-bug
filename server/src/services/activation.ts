import type pg from 'pg'
import type { UserIdentifier } from '../sharedTypes/typesDBuser'
import { resolveUserIdentifier } from './user'

export async function activateUser(sqlClient: pg.Pool, identifier: UserIdentifier) {
  const userIdentifier = resolveUserIdentifier(identifier)
  return sqlClient.query(`UPDATE users SET activated = true WHERE ${userIdentifier.key} = $1;`, [userIdentifier.value])
}
