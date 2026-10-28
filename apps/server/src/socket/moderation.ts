import type pg from 'pg'
import Joi from 'joi'
import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import { reportCategories, type ModerationStatus } from '../sharedTypes/typesReports'
import { maxReportBodyLength } from '../sharedDefinitions/reports'
import logger from '../helpers/logger'
import { isAdmin } from '../helpers/authentication'
import { addReport, blockUser, countOpenReports, dismissReports, getModerators, getOpenReports, isModerator, setModerator, unblockUser } from '../services/reports'
import { nspGeneral } from './general'

async function getModerationStatus(pgPool: pg.Pool, userID: number | undefined): Promise<ModerationStatus> {
  if (userID == null || !(await isModerator(pgPool, userID))) return { moderator: false, admin: false, openReports: 0 }
  const admin = await isAdmin(pgPool, userID)
  return { moderator: true, admin: admin.isOk() && admin.value, openReports: await countOpenReports(pgPool) }
}

/** Sends moderators the number of users with open reports (count in the menu); others get nothing. */
export async function sendModerationStatus(pgPool: pg.Pool, socket: GeneralSocketS, evenIfNoModerator = false) {
  const status = await getModerationStatus(pgPool, socket.data.userID)
  if (status.moderator || evenIfNoModerator) socket.emit('moderation:status', status)
}

async function updateModerators(pgPool: pg.Pool) {
  for (const s of nspGeneral.sockets.values()) {
    await sendModerationStatus(pgPool, s)
  }
}

/** A block or unblock applies at once to the sockets of the user, not only after the next login. */
function setBlockedOnSockets(userID: number, blocked: boolean) {
  for (const s of nspGeneral.sockets.values()) {
    if (s.data.userID === userID) s.data.blockedByModeration = blocked
  }
}

export function registerModerationHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  // The client asks when it is ready to listen; pushed updates follow with 'moderation:status'
  socket.on('moderation:status', async (cb) => {
    try {
      return cb({ status: 200, data: await getModerationStatus(pgPool, socket.data.userID) })
    } catch (err) {
      logger.error('Error in moderation:status', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('moderation:report', async (data, cb) => {
    if (socket.data.userID == null) return cb({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      username: Joi.string().required(),
      category: Joi.string()
        .valid(...reportCategories)
        .required(),
      body: Joi.string().allow('').max(maxReportBodyLength).required(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 422, error })

    try {
      const res = await addReport(pgPool, socket.data.userID, data.username, data.category, data.body)
      if (res.isErr()) return cb({ status: 400, error: res.error })
      await updateModerators(pgPool)
      return cb({ status: 200, data: null })
    } catch (err) {
      logger.error('Error in moderation:report', err)
      return cb({ status: 500, error: err })
    }
  })

  // Everything below is only for moderators and admins
  const onlyModerators = async (cb: (data: { status: number; error?: any }) => void) => {
    if (socket.data.userID == null || !(await isModerator(pgPool, socket.data.userID))) {
      cb({ status: 403, error: 'NO_MODERATOR' })
      return false
    }
    return true
  }

  socket.on('moderation:reports', async (cb) => {
    if (!(await onlyModerators(cb))) return
    try {
      return cb({ status: 200, data: await getOpenReports(pgPool) })
    } catch (err) {
      logger.error('Error in moderation:reports', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('moderation:block', async (data, cb) => {
    if (!(await onlyModerators(cb))) return

    const schema = Joi.object({
      username: Joi.string().required(),
      days: Joi.number().integer().min(1).max(3650).required(),
      reason: Joi.string().min(1).max(200).required(),
      resetProfile: Joi.boolean().required(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 422, error })

    try {
      const res = await blockUser(pgPool, socket.data.userID, data.username, data.days, data.reason, data.resetProfile)
      if (res.isErr()) return cb({ status: 400, error: res.error })
      setBlockedOnSockets(res.value, true)
      await updateModerators(pgPool)
      return cb({ status: 200, data: null })
    } catch (err) {
      logger.error('Error in moderation:block', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('moderation:unblock', async (username, cb) => {
    if (!(await onlyModerators(cb))) return
    const { error } = Joi.string().required().validate(username)
    if (error != null) return cb({ status: 422, error })

    try {
      const res = await unblockUser(pgPool, socket.data.userID, username)
      if (res.isErr()) return cb({ status: 400, error: res.error })
      setBlockedOnSockets(res.value, false)
      await updateModerators(pgPool)
      return cb({ status: 200, data: null })
    } catch (err) {
      logger.error('Error in moderation:unblock', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('moderation:dismiss', async (username, cb) => {
    if (!(await onlyModerators(cb))) return
    const { error } = Joi.string().required().validate(username)
    if (error != null) return cb({ status: 422, error })

    try {
      const res = await dismissReports(pgPool, socket.data.userID, username)
      if (res.isErr()) return cb({ status: 400, error: res.error })
      await updateModerators(pgPool)
      return cb({ status: 200, data: null })
    } catch (err) {
      logger.error('Error in moderation:dismiss', err)
      return cb({ status: 500, error: err })
    }
  })

  socket.on('moderation:moderators', async (cb) => {
    if (!(await onlyModerators(cb))) return
    return cb({ status: 200, data: await getModerators(pgPool) })
  })

  // Only admins name moderators
  socket.on('moderation:setModerator', async (data, cb) => {
    const admin = socket.data.userID != null ? await isAdmin(pgPool, socket.data.userID) : null
    if (admin == null || !admin.isOk() || !admin.value) return cb({ status: 403, error: 'NO_ADMIN' })

    const schema = Joi.object({ username: Joi.string().required(), moderator: Joi.boolean().required() })
    const { error } = schema.validate(data)
    if (error != null) return cb({ status: 422, error })

    const res = await setModerator(pgPool, data.username, data.moderator)
    if (res.isErr()) return cb({ status: 400, error: res.error })
    for (const s of nspGeneral.sockets.values()) {
      if (s.data.userID === res.value) await sendModerationStatus(pgPool, s, true)
    }
    return cb({ status: 200, data: await getModerators(pgPool) })
  })
}
