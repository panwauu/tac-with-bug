import type pg from 'pg'
import sharp from 'sharp'

// https://avatars.dicebear.com/styles/bottts
import { createAvatar } from '@dicebear/avatars'
import * as style from '@dicebear/avatars-bottts-sprites'

import { resolveUserIdentifier } from '../services/user'
import type { UserIdentifier } from '../sharedTypes/typesDBuser'
import { ok, err, Result } from 'neverthrow'

const profilePictureSize = 160

async function saveProfilePicture(sqlClient: pg.Pool, profilePicAsByteA: any, userID: number) {
  const text = 'UPDATE users SET profilepic = $1 WHERE id = $2'
  return sqlClient.query(text, [profilePicAsByteA, userID])
}

type QueryProfilePictureErrors = 'NO_USER_FOR_PROFILEPICTURE_FOUND'
export async function queryProfilePicture(sqlClient: pg.Pool, identifier: UserIdentifier): Promise<Result<string, QueryProfilePictureErrors>> {
  const userIdentifier = resolveUserIdentifier(identifier)
  const res = await sqlClient.query(`SELECT profilepic FROM users WHERE ${userIdentifier.key} = $1;`, [userIdentifier.value])
  if (res.rowCount !== 1) {
    return err('NO_USER_FOR_PROFILEPICTURE_FOUND')
  }
  return ok(res.rows[0].profilepic.toString('base64'))
}

export async function selectRandomProfilePicture(sqlClient: pg.Pool, userID: number) {
  const svg = createAvatar(style)
  const svgBuffer = Buffer.from(svg, 'utf8')
  const resizedBuffer = await sharp(svgBuffer).resize(profilePictureSize, profilePictureSize).toBuffer()
  await saveProfilePicture(sqlClient, resizedBuffer, userID)
}

export async function loadProfilePictureToDB(sqlClient: pg.Pool, userID: number, buffer: Buffer) {
  const resizedBuffer = await sharp(buffer).resize(profilePictureSize, profilePictureSize).toBuffer()
  await saveProfilePicture(sqlClient, resizedBuffer, userID)
}
