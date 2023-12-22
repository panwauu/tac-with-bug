import type pg from 'pg'
import type * as hofTypes from '../sharedTypes/typesHof'

export async function getHofData(sqlClient: pg.Pool): Promise<hofTypes.HofData> {
  const res = await sqlClient.query('SELECT hof.status, users.username FROM hof INNER JOIN users ON users.id = hof.userid;')

  return {
    verlag: res.rows.filter((row) => row.status === 'verlag').map((row) => row.username),
    spende: res.rows.filter((row) => row.status === 'spende').map((row) => row.username),
    translation: res.rows.filter((row) => row.status === 'translation').map((row) => row.username),
    family: res.rows.filter((row) => row.status === 'family').map((row) => row.username),
  }
}

export async function isHofMember(sqlClient: pg.Pool, username: string): Promise<hofTypes.HofReason[]> {
  const res = await sqlClient.query('SELECT status FROM hof LEFT JOIN users ON hof.userid = users.id WHERE users.username=$1;', [username])
  return res.rows.map((r) => r.status)
}
