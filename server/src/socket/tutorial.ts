import type pg from 'pg'
import type { TutorialStepDefinition } from '../../../shared/types/typesTutorial'
import logger from '../helpers/logger'
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition'
import { game } from '../game/game'
import { getPlayerUpdateFromGame } from '../game/serverOutput'
import { getDefaultTutorialProgress, getTutorialProgress, resetTutorialProgress, setTutorialProgress } from '../services/tutorial'
import Joi from 'joi'

export async function initializeTutorial(pgPool: pg.Pool, socket: GeneralSocketS) {
  let progess = await getDefaultTutorialProgress(pgPool)

  if (socket.data.userID != null) {
    const userProgress = await getTutorialProgress(pgPool, socket.data.userID)
    if (userProgress.isOk()) {
      progess = userProgress.value
    }
  }

  socket.emit('tutorial:loadProgress', progess)
}

export async function registerTutorialHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.on('tutorial:load', async (data, callback) => {
    const schema = Joi.object({
      tutorialID: Joi.number().required().integer().min(0),
      tutorialStep: Joi.number().required().integer().min(0),
    })
    const { error } = schema.validate(data)
    if (error != null) {
      return callback({ status: 500, error: error })
    }

    const dbRes = await pgPool.query<{ size: number; tutorial_step_definition: TutorialStepDefinition }>(
      'SELECT jsonb_array_length(data) as size, data->CAST($2 AS INT) as tutorial_step_definition FROM tutorials WHERE id=$1;',
      [data.tutorialID, data.tutorialStep]
    )
    if (dbRes.rowCount === 0 || data.tutorialStep + 1 > dbRes.rows[0].size) {
      return callback({ status: 500, error: 'Could not query Tutorial Step' })
    }

    const updateData = getPlayerUpdateFromGame(dbRes.rows[0].tutorial_step_definition.game, 0)

    return callback({ status: 200, data: { ...dbRes.rows[0].tutorial_step_definition, updateData } })
  })

  socket.on('tutorial:postMove', async (data, callback) => {
    try {
      const gameForPlay = data.game
      gameForPlay.game = new game(data.game.nPlayers, data.game.nTeams, data.game.game.cards.meisterVersion, data.game.coop, data.game.game)
      const res = gameForPlay.game.checkMove(data.move)
      if (!res) {
        return callback({ status: 500, error: 'Move is not valid' })
      }

      gameForPlay.game.performActionAfterStatistics(data.move)

      return callback({
        status: 200,
        data: {
          game: gameForPlay,
          updateData: getPlayerUpdateFromGame(gameForPlay, 0),
        },
      })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('tutorial:loadProgress', async (callback) => {
    if (socket.data.userID === undefined) {
      const defaultProgess = await getDefaultTutorialProgress(pgPool)
      return callback({ status: 200, data: { progress: defaultProgess } })
    }

    try {
      const progress = await getTutorialProgress(pgPool, socket.data.userID)
      if (progress.isErr()) {
        return callback({ status: 500, error: progress.error })
      }

      return callback({ status: 200, data: { progress: progress.value } })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('tutorial:changeTutorialStep', async (data, callback) => {
    if (socket.data.userID === undefined) {
      logger.error('Event forbidden for unauthenticated user (tutorial:changeTutorialStep)', { stack: new Error().stack })
      return callback({ status: 500 })
    }

    const schema = Joi.object({
      tutorialID: Joi.number().required().integer().min(0),
      tutorialStep: Joi.number().required().integer().min(0),
      done: Joi.boolean().required(),
    })
    const { error } = schema.validate(data)
    if (error != null) {
      return callback({ status: 500, error: error })
    }

    try {
      const setRes = await setTutorialProgress(pgPool, socket.data.userID, data.tutorialID, data.tutorialStep, data.done)
      if (setRes.isErr()) {
        return callback({ status: 500, error: setRes.error })
      }

      return callback({ status: 200, data: { progress: setRes.value } })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })

  socket.on('tutorial:resetTutorial', async (data, callback) => {
    if (socket.data.userID === undefined) {
      logger.error('Event forbidden for unauthenticated user (tutorial:resetTutorial)', { stack: new Error().stack })
      return callback({ status: 500 })
    }

    const schema = Joi.object({ tutorialID: Joi.number().required().integer().min(0) })
    const { error } = schema.validate(data)
    if (error != null) {
      return callback({ status: 500, error: error })
    }

    try {
      const setRes = await resetTutorialProgress(pgPool, socket.data.userID, data.tutorialID)
      if (setRes.isErr()) {
        return callback({ status: 500, error: setRes.error })
      }

      return callback({ status: 200, data: { progress: setRes.value } })
    } catch (err) {
      return callback({ status: 500, error: err })
    }
  })
}
