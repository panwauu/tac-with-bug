import type { GeneralSocketS } from '../sharedTypes/GeneralNamespaceDefinition'
import type pg from 'pg'
import Joi from 'joi'

import {
  changeColor,
  deleteWaitingGame,
  getWaitingGames,
  removePlayer,
  addPlayer,
  createWaitingGame,
  movePlayer,
  setPlayerReady,
  createRematchGame,
  addBot,
  moveBot,
  removeBot,
  createGameFromWaitingGame,
} from '../services/waiting'
import { getGame } from '../services/game'
import { emitGamesUpdate, emitRunningGamesUpdate } from './games'
import { sendUpdatesOfGameToPlayers } from './game'
import { getUser } from '../services/user'
import { nspGeneral } from './general'
import { transferLatestMessagesToOtherChannel } from '../services/channel'

export async function initializeWaiting(pgPool: pg.Pool, socket: GeneralSocketS) {
  socket.emit('waiting:getGames', await getWaitingGames(pgPool))
}

export async function terminateWaiting(pgPool: pg.Pool, socket: GeneralSocketS) {
  if (socket.data.userID != null) {
    const user = await getUser(pgPool, { id: socket.data.userID })
    if (!user.isErr()) {
      await removePlayer(pgPool, user.value.username, socket.data.userID)
    }
  }
  nspGeneral.emit('waiting:getGames', await getWaitingGames(pgPool))
}

export function registerWaitingHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
  const emitGetGames = async () => {
    const waitingGames = await getWaitingGames(pgPool)
    nspGeneral.emit('waiting:getGames', waitingGames)
  }

  socket.on('waiting:getGames', emitGetGames)

  socket.on('waiting:joinGame', async (gameID, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.number().required().integer().positive()
    const { error } = schema.validate(gameID)
    if (error != null) return cb?.({ status: 500, error })

    const user = await getUser(pgPool, { id: socket.data.userID })
    if (user.isErr()) return cb?.({ status: 500, error: user.error })

    const removeRes = await removePlayer(pgPool, user.value.username, socket.data.userID)
    if (removeRes.isErr()) return cb?.({ status: 500, error: removeRes.error })

    const addRes = await addPlayer(pgPool, gameID, socket.data.userID)
    if (addRes.isErr()) return cb?.({ status: 500, error: addRes.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:addBot', async (gameID, botID, playerIndex, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      gameID: Joi.number().required().integer().positive(),
      botID: Joi.number().required().integer(),
      playerIndex: Joi.number().required(),
    })
    const { error } = schema.validate({ gameID, botID, playerIndex })
    if (error != null) return cb?.({ status: 500, error })

    const addRes = await addBot(pgPool, gameID, botID, playerIndex, socket.data.userID)
    if (addRes.isErr()) return cb?.({ status: 500, error: addRes.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:createGame', async (data, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      nPlayers: Joi.number().required().valid(4, 6),
      nTeams: Joi.number().required().valid(1, 2, 3),
      meister: Joi.boolean().required(),
      private: Joi.boolean().required(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb?.({ status: 500, error })

    const user = await getUser(pgPool, { id: socket.data.userID })
    if (user.isErr()) return cb?.({ status: 500, error: user.error })

    await removePlayer(pgPool, user.value.username, socket.data.userID)
    await createWaitingGame(pgPool, data.nPlayers === 4 ? 4 : 6, data.nTeams === 1 ? 1 : data.nTeams === 2 ? 2 : 3, data.meister, data.private, socket.data.userID)
    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:movePlayer', async (data, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      gameID: Joi.number().required().integer().positive(),
      username: Joi.string().required(),
      steps: Joi.number().required().integer(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb?.({ status: 500, error })

    const res = await movePlayer(pgPool, data.gameID, data.username, data.steps > 0, socket.data.userID)
    if (res.isErr()) return cb?.({ status: 500, error: res.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:moveBot', async (data, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      gameID: Joi.number().required().integer().positive(),
      playerIndex: Joi.number().required().integer(),
      steps: Joi.number().required().integer(),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb?.({ status: 500, error })

    const res = await moveBot(pgPool, data.gameID, data.playerIndex, data.steps > 0, socket.data.userID)
    if (res.isErr()) return cb?.({ status: 500, error: res.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:removePlayer', async (username, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.string().required()
    const { error } = schema.validate(username)
    if (error != null) return cb?.({ status: 500, error })

    const res = await removePlayer(pgPool, username, socket.data.userID)
    if (res.isErr()) return cb?.({ status: 500, error: res.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:removeBot', async (gameID, playerIndex, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      gameID: Joi.number().required().integer().positive(),
      playerIndex: Joi.number().required().integer(),
    })
    const { error } = schema.validate({ gameID, playerIndex })
    if (error != null) return cb?.({ status: 500, error })

    const res = await removeBot(pgPool, gameID, playerIndex, socket.data.userID)
    if (res.isErr()) return cb?.({ status: 500, error: res.error })

    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:readyPlayer', async (data, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({ gameID: Joi.number().required().integer().positive() })
    const { error } = schema.validate(data)
    if (error != null) return cb?.({ status: 500, error })

    const game = await setPlayerReady(pgPool, data.gameID, socket.data.userID)
    if (game.isErr()) return cb?.({ status: 500, error: game.error })

    if (game.value.ready.every((r, i) => r === true || i >= game.value.nPlayers || game.value.bots[i] != null)) {
      deleteWaitingGame(pgPool, data.gameID)
      const createdGame = await createGameFromWaitingGame(pgPool, game.value)
      await transferLatestMessagesToOtherChannel(pgPool, `g-${createdGame.id}`, `w-${game.value.id}`)
      for (const [, value] of nspGeneral.sockets.entries()) {
        const userID = value.data.userID
        if (userID != null && createdGame.playerIDs.includes(userID)) {
          value.emit('waiting:startGame', {
            gameID: createdGame.id,
            nPlayers: createdGame.nPlayers,
            gamePlayer: createdGame.playerIDs.indexOf(userID),
          })
          emitGamesUpdate(pgPool, value)
        }
      }
    }
    emitRunningGamesUpdate(pgPool)
    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:switchColor', async (data, cb) => {
    if (socket.data.userID === undefined) return cb?.({ status: 500, error: 'UNAUTH' })

    const schema = Joi.object({
      gameID: Joi.number().required().integer(),
      username: Joi.string().required().allow(''),
      color: Joi.string().required(),
      botIndex: Joi.number().integer().allow(null),
    })
    const { error } = schema.validate(data)
    if (error != null) return cb?.({ status: 500, error })

    const res = await changeColor(pgPool, data.gameID, data.username, data.color, socket.data.userID, data.botIndex)
    if (res.isErr()) return cb?.({ status: 500, error: res.error })
    emitGetGames()
    return cb?.({ status: 200 })
  })

  socket.on('waiting:createRematch', async (data, cb) => {
    if (socket.data.userID === undefined) return cb({ ok: false, error: 'UNAUTH' })

    const schema = Joi.object({ gameID: Joi.number().required().integer().positive() })
    const { error } = schema.validate(data)
    if (error != null) return cb({ ok: false, error })

    try {
      const game = await getGame(pgPool, data.gameID)

      const rematchResult = await createRematchGame(pgPool, game, socket.data.userID)
      sendUpdatesOfGameToPlayers(game)
      if (rematchResult.isErr()) return cb({ ok: false, error: rematchResult.error })

      await transferLatestMessagesToOtherChannel(pgPool, `w-${rematchResult.value}`, `g-${game.id}`)
      emitGetGames()
      return cb({ ok: true, value: null })
    } catch (e: any) {
      return cb({ ok: false, error: e.message })
    }
  })
}
