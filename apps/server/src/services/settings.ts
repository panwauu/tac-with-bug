import { ok, err, Result } from 'neverthrow'
import type pg from 'pg'
import logger from '../helpers/logger'

export const EmailNotificationSettingsDecoder = ['news', 'tournamentNews', 'tournamentInvitations', 'sponsoring', 'messages', 'friendRequests'] as const
export type KeyOfEmailNotificationSettings = (typeof EmailNotificationSettingsDecoder)[number]
export type EmailNotificationSettingsType = Record<KeyOfEmailNotificationSettings, boolean>

function convertNotificationArrayToObject(array: boolean[]) {
  return EmailNotificationSettingsDecoder.reduce((obj, key, index) => {
    obj[key] = array[index] ?? false
    return obj
  }, {} as EmailNotificationSettingsType)
}

function convertNotificationObjectToArray(obj: EmailNotificationSettingsType) {
  return EmailNotificationSettingsDecoder.map((key) => obj[key] ?? false)
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
    const values = [array, userID]
    const res = await pgPool.query<{ notification_settings: boolean[] }>('UPDATE users SET notification_settings = $1 WHERE id = $2 RETURNING notification_settings;', values)
    if (res.rowCount !== 1) return err('NOTIFICATION_VALUES_NOT_MODIFIED')
    return ok(convertNotificationArrayToObject(res.rows[0].notification_settings))
  } catch (error) {
    logger.error(error)
    return err('COULD_NOT_CHANGE_NOTIFICATION_VALUES')
  }
}

export async function getEmailsFromUsersForNews(pgPool: pg.Pool, type: 'news' | 'tournamentNews') {
  const indexOfSettings = EmailNotificationSettingsDecoder.indexOf(type)
  const res = await pgPool.query<{ email: string }>('SELECT email FROM users WHERE notification_settings[$1] IS true;', [indexOfSettings + 1])
  return res.rows.map((e) => e.email).join(';')
}

// colorScheme can be 'light', 'dark' or 'system'
// in Database stored as:
// - NULL -> system
// - 0 -> light
// - 1 -> dark
export type SetColorSchemeSettingsError = 'COULD_NOT_CHANGE_COLOR_SCHEME'
export async function setColorSchemeSettings(pgPool: pg.Pool, userID: number, colorScheme: 'light' | 'dark' | 'system'): Promise<Result<void, SetColorSchemeSettingsError>> {
  try {
    let prefersDarkMode = null
    if (colorScheme === 'dark') prefersDarkMode = 1
    else if (colorScheme === 'light') prefersDarkMode = 0

    await pgPool.query('UPDATE users SET prefers_dark_mode = $1 WHERE id = $2;', [prefersDarkMode, userID])
    return ok()
  } catch (error) {
    logger.error(error)
    return err('COULD_NOT_CHANGE_COLOR_SCHEME')
  }
}
