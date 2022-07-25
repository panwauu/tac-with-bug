import { Result, ok, err } from 'neverthrow'
import type pg from 'pg'
import { getSocketByUserID, sendUpdatesOfGameToPlayers } from '../socket/game'
import type { GameForPlay } from '../sharedTypes/typesDBgame'
import { getGame, updateGame } from './game'
import { initalizeStatistic } from '../game/statistic'
import { addJob } from './scheduledTasks'
import { scheduleJob } from 'node-schedule'
import { getUser } from './user'

const MAX_TIME_FOR_REPLACEMENT = 60 * 1000

export function checkReplacementConditions(game: GameForPlay, playerIndexToReplace: number, replacementPlayerID: number): boolean {
  return (
    game.status === 'running' &&
    (game.game.replacement == null || !game.game.replacement.running) &&
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

  game.game.replacement = {
    running: true,
    replacementUserID: replacementPlayerID,
    replacementUsername: user.value.username,
    playerToReplace: game.playerIDs[playerIndexToReplace],
    acceptedBy: [],
    rejectedBy: [],
    startDate: Date.now(),
  }
  await updateGame(pgPool, game.id, game.game.getJSON(), game.status, false, false)
  sendUpdatesOfGameToPlayers(game)

  addJob(
    scheduleJob(Date.now() + MAX_TIME_FOR_REPLACEMENT, async () => {
      const newGame = await getGame(pgPool, game.id)
      await endReplacementOnTime(pgPool, newGame)
    })
  )
}

export type AcceptReplacementError = 'NO_ACTIVE_REPLACEMENT' | 'REPLACEMENT_ALREADY_ACCEPTED' | 'CANNOT_ACCEPT_OWN_REPLACEMENT'
export async function acceptReplacement(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<null, AcceptReplacementError>> {
  if (game.game.replacement == null || game.game.replacement.running === false) {
    return err('NO_ACTIVE_REPLACEMENT')
  }

  if (game.game.replacement.acceptedBy.includes(userID)) {
    return err('REPLACEMENT_ALREADY_ACCEPTED')
  }

  if (game.game.replacement.playerToReplace === userID) {
    return err('CANNOT_ACCEPT_OWN_REPLACEMENT')
  }

  game.game.replacement.acceptedBy.push(userID)
  if (game.game.replacement.acceptedBy.length >= game.game.nPlayers - 1) {
    const playerIndexToReplace = game.playerIDs.findIndex((id) => id === game.game.replacement?.playerToReplace)
    const playerIndexAdditional = game.game.statistic.length
    if (playerIndexToReplace === -1) {
      throw new Error('Replacement failed as playerIndex could not be found')
    }

    game.game.replacedPlayerIndices.push(playerIndexToReplace)

    // handle statistics
    game.game.statistic.push(initalizeStatistic(1)[0])
    ;[game.game.statistic[playerIndexAdditional], game.game.statistic[playerIndexToReplace]] = [
      game.game.statistic[playerIndexToReplace],
      game.game.statistic[playerIndexAdditional],
    ]

    await pgPool.query('UPDATE users_to_games SET player_index = $1 WHERE userid = $2 AND gameid = $3;', [playerIndexAdditional, game.game.replacement.playerToReplace, game.id])
    await pgPool.query('INSERT INTO users_to_games (player_index, userid, gameid) VALUES ($1, $2, $3);', [playerIndexToReplace, game.game.replacement.replacementUserID, game.id])
    // TBD -> Consequences?

    getSocketByUserID(game.game.replacement.playerToReplace)?.disconnect()
    const newSocket = getSocketByUserID(game.game.replacement.replacementUserID)
    if (newSocket != null) {
      newSocket.data.gamePlayer = playerIndexToReplace
      newSocket.emit('replacement:changeGamePlayer', playerIndexToReplace)
    }
    // TBD - Toasts

    game.game.replacement.running = false
  }

  await updateGame(pgPool, game.id, game.game.getJSON(), game.status, false, false)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export type RejectReplacementError = 'NO_RUNNING_REPLACEMENT'
export async function rejectReplacement(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<null, RejectReplacementError>> {
  if (game.game.replacement == null || game.game.replacement.running === false) {
    return err('NO_RUNNING_REPLACEMENT')
  }

  // TBD more checks
  game.game.replacement.rejectedBy.push(userID)
  game.game.replacement.running = false
  await updateGame(pgPool, game.id, game.game.getJSON(), game.status, false, false)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export async function endReplacementOnTime(pgPool: pg.Pool, game: GameForPlay) {
  if (game.game.replacement != null && game.game.replacement.running && Date.now() - game.game.replacement.startDate > MAX_TIME_FOR_REPLACEMENT) {
    game.game.replacement.running = false
    await updateGame(pgPool, game.id, game.game.getJSON(), game.status, false, false)
    sendUpdatesOfGameToPlayers(game)
  }
}
