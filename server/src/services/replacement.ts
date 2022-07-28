import { Result, ok, err } from 'neverthrow'
import type pg from 'pg'
import { getSocketByUserID, getSocketsInGame, nsp, sendUpdatesOfGameToPlayers } from '../socket/game'
import type { GameForPlay } from '../sharedTypes/typesDBgame'
import { getGame, updateGame } from './game'
import { initalizeStatistic } from '../game/statistic'
import { addJob } from './scheduledTasks'
import { scheduleJob } from 'node-schedule'
import { getUser } from './user'
import { Replacement } from '../sharedTypes/game'

const MAX_TIME_FOR_REPLACEMENT = 60 * 1000

const currentReplacements = new Map<number, Replacement>()

export function getReplacement(gameID: number) {
  return currentReplacements.get(gameID) ?? null
}

export function setReplacement(gameID: number, replacement: Replacement | null) {
  replacement != null ? currentReplacements.set(gameID, replacement) : currentReplacements.delete(gameID)
}

export function endReplacementIfRunning(game: GameForPlay) {
  if (game.replacement != null) {
    setReplacement(game.id, null)
    game.replacement = null
  }
}

export async function endReplacementsByUserID(pgPool: pg.Pool, userID: number) {
  for (const [key, replacement] of currentReplacements) {
    if (replacement.replacementUserID === userID) {
      setReplacement(key, null)
      const game = await getGame(pgPool, key)
      sendUpdatesOfGameToPlayers(game)
    }
  }
}

export function checkReplacementConditions(game: GameForPlay, playerIndexToReplace: number, replacementPlayerID: number): boolean {
  return (
    game.status === 'running' &&
    game.replacement == null &&
    game.game.activePlayer === playerIndexToReplace &&
    Date.now() - game.lastPlayed > 60 * 1000 &&
    !game.playerIDs.includes(replacementPlayerID)
  )
}

export async function startReplacement(pgPool: pg.Pool, game: GameForPlay, replacementPlayerID: number, playerIndexToReplace: number) {
  const user = await getUser(pgPool, { id: replacementPlayerID })
  if (user.isErr()) {
    throw ''
  }

  game.replacement = {
    replacementUserID: replacementPlayerID,
    replacementUsername: user.value.username,
    playerIndexToReplace: playerIndexToReplace,
    acceptedByIndex: [],
    rejectedByIndex: [],
    startDate: Date.now(),
  }
  setReplacement(game.id, game.replacement)
  sendUpdatesOfGameToPlayers(game)

  addJob(
    scheduleJob(Date.now() + MAX_TIME_FOR_REPLACEMENT, () => {
      checkReplacementsForTime(pgPool)
    })
  )
}

export type AcceptReplacementError = 'NO_ACTIVE_REPLACEMENT' | 'REPLACEMENT_ALREADY_ACCEPTED' | 'CANNOT_ACCEPT_OWN_REPLACEMENT'
export async function acceptReplacement(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<null, AcceptReplacementError>> {
  if (game.replacement == null) {
    return err('NO_ACTIVE_REPLACEMENT')
  }

  const playerIndex = game.playerIDs.findIndex((id) => id == userID)
  if (game.replacement.acceptedByIndex.includes(playerIndex)) {
    return err('REPLACEMENT_ALREADY_ACCEPTED')
  }

  if (game.replacement.playerIndexToReplace === playerIndex) {
    return err('CANNOT_ACCEPT_OWN_REPLACEMENT')
  }

  game.replacement.acceptedByIndex.push(playerIndex)
  if (game.replacement.acceptedByIndex.length >= game.game.nPlayers - 1) {
    const playerIndexAdditional = game.game.statistic.length
    if (game.replacement.playerIndexToReplace === -1) {
      throw new Error('Replacement failed as playerIndex could not be found')
    }

    game.game.replacedPlayerIndices.push(game.replacement.playerIndexToReplace)

    // handle statistics
    game.game.statistic.push(initalizeStatistic(1)[0])
    ;[game.game.statistic[playerIndexAdditional], game.game.statistic[game.replacement.playerIndexToReplace]] = [
      game.game.statistic[game.replacement.playerIndexToReplace],
      game.game.statistic[playerIndexAdditional],
    ]

    await pgPool.query('UPDATE users_to_games SET player_index = $1 WHERE userid = $2 AND gameid = $3;', [
      playerIndexAdditional,
      game.playerIDs[game.replacement.playerIndexToReplace],
      game.id,
    ])
    await pgPool.query('INSERT INTO users_to_games (player_index, userid, gameid) VALUES ($1, $2, $3);', [
      game.replacement.playerIndexToReplace,
      game.replacement.replacementUserID,
      game.id,
    ])
    // TBD -> Consequences?

    getSocketByUserID(game.playerIDs[game.replacement.playerIndexToReplace])?.disconnect()
    const newSocket = getSocketByUserID(game.replacement.replacementUserID)
    if (newSocket != null) {
      newSocket.data.gamePlayer = game.replacement.playerIndexToReplace
      newSocket.emit('replacement:changeGamePlayer', game.replacement.playerIndexToReplace)
    }
    getSocketsInGame(nsp, game.id).forEach((s) =>
      s.emit('toast:replacement-done', game.replacement?.replacementUsername ?? '', game.players[game.replacement?.playerIndexToReplace ?? 0])
    )
    updateGame(pgPool, game.id, game.game.getJSON(), game.status, false, false)

    game.replacement = null
    setReplacement(game.id, null)
    game = await getGame(pgPool, game.id)
  }

  setReplacement(game.id, game.replacement)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export type RejectReplacementError = 'NO_RUNNING_REPLACEMENT'
export async function rejectReplacement(game: GameForPlay, userID: number): Promise<Result<null, RejectReplacementError>> {
  if (game.replacement == null) {
    return err('NO_RUNNING_REPLACEMENT')
  }

  // TBD more checks
  const playerIndex = game.playerIDs.findIndex((id) => id == userID)
  game.replacement.rejectedByIndex.push(playerIndex)
  game.replacement = null
  setReplacement(game.id, game.replacement)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export async function checkReplacementsForTime(pgPool: pg.Pool) {
  for (const [key, replacement] of currentReplacements) {
    if (Date.now() - replacement.startDate > MAX_TIME_FOR_REPLACEMENT) {
      currentReplacements.delete(key)
      const game = await getGame(pgPool, key)
      sendUpdatesOfGameToPlayers(game)
    }
  }
}

// TBD: on unconnect end replacement
