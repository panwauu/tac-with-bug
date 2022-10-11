import { ok, err, Result } from 'neverthrow'
import type pg from 'pg'
import logger from '../helpers/logger'

export const EmailNotificationSettings = Object.freeze({
  news: 0,
  tournamentNews: 1,
  tournamentInvitations: 2,
  sponsoring: 3,
  messages: 4,
  friendRequests: 5,
})
export type KeyOfEmailNotificationSettings = keyof typeof EmailNotificationSettings
export type EmailNotificationSettingsType = Record<KeyOfEmailNotificationSettings, boolean>

function convertNotificationArrayToObject(array: boolean[]) {
  return (Object.keys(EmailNotificationSettings) as KeyOfEmailNotificationSettings[]).reduce((obj, key) => {
    obj[key] = array[EmailNotificationSettings[key]] ?? false
    return obj
  }, {} as Record<KeyOfEmailNotificationSettings, boolean>)
}

function convertNotificationObjectToArray(obj: EmailNotificationSettingsType) {
  try {
    const array = Object.keys(obj).map((_, i) => {
      const key = Object.entries(EmailNotificationSettings).find((e) => e[1] === i)?.[0] as KeyOfEmailNotificationSettings
      if (key === undefined) throw new Error('Could not reconstruct array')
      return obj[key]
    })
    return ok(array)
  } catch {
    return err('COULD_NOT_CONVERT_TO_ARRAY')
  }
}

export type GetEmailNotificationSettingsError = 'NO_ENTRY_FOUND'
export async function getEmailNotificationSettings(pgPool: pg.Pool, userID: number): Promise<Result<EmailNotificationSettingsType, GetEmailNotificationSettingsError>> {
  const res = await pgPool.query<{ notification_settings: boolean[] }>('SELECT notification_settings FROM users WHERE id=$1;', [userID])
  if (res.rowCount === 0) return err('NO_ENTRY_FOUND')
  return ok(convertNotificationArrayToObject(res.rows[0].notification_settings))
}

export type SetEmailNotificationSettingsError = 'NOTIFICATION_VALUES_NOT_MODIFIED' | 'COULD_NOT_CHANGE_NOTIFICATION_VALUES' | 'COULD_NOT_CONVERT_TO_ARRAY'
export async function setEmailNotificationSettings(
  pgPool: pg.Pool,
  userID: number,
  settings: EmailNotificationSettingsType
): Promise<Result<EmailNotificationSettingsType, SetEmailNotificationSettingsError>> {
  try {
    const array = convertNotificationObjectToArray(settings)
    if (array.isErr()) return err(array.error as any)
    const values = [array.value, userID]
    const res = await pgPool.query<{ notification_settings: boolean[] }>('UPDATE users SET notification_settings = $1 WHERE id = $2 RETURNING notification_settings;', values)
    if (res.rowCount !== 1) return err('NOTIFICATION_VALUES_NOT_MODIFIED')
    return ok(convertNotificationArrayToObject(res.rows[0].notification_settings))
  } catch (error) {
    logger.error(error)
    return err('COULD_NOT_CHANGE_NOTIFICATION_VALUES')
  }
}
