import { Result, ok, err } from 'neverthrow'
import type pg from 'pg'
import { getSocketByUserID, getSocketsInGame, nsp, sendUpdatesOfGameToPlayers } from '../socket/game'
import type { GameForPlay } from '../sharedTypes/typesDBgame'
import { getGame, updateGame } from './game'
import { initalizeStatistic } from '../game/statistic'
import { addJob } from './scheduledTasks'
import { scheduleJob } from 'node-schedule'
import { getUser, GetUserErrors } from './user'
import type { Substitution } from '../sharedTypes/game'

const MAX_TIME_FOR_SUBSTITUTION = 60 * 1000

const currentSubstitutions = new Map<number, Substitution>()

export function getSubstitution(gameID: number) {
  return currentSubstitutions.get(gameID) ?? null
}

export function setSubstitution(gameID: number, substitution: Substitution | null) {
  substitution != null ? currentSubstitutions.set(gameID, substitution) : currentSubstitutions.delete(gameID)
}

export function endSubstitutionIfRunning(game: GameForPlay) {
  if (game.substitution != null) {
    setSubstitution(game.id, null)
    game.substitution = null
  }
}

export async function endSubstitutionsByUserID(pgPool: pg.Pool, userID: number) {
  for (const [key, substitution] of currentSubstitutions) {
    if (substitution.substitutionUserID === userID) {
      setSubstitution(key, null)
      const game = await getGame(pgPool, key)
      sendUpdatesOfGameToPlayers(game)
    }
  }
}

export function checkSubstitutionConditions(game: GameForPlay, playerIndexToSubstitute: number, substitutionPlayerID: number): boolean {
  return (
    game.running &&
    game.substitution == null &&
    (playerShouldPlay(game, playerIndexToSubstitute) || playerShouldTrade(game, playerIndexToSubstitute)) &&
    Date.now() - game.lastPlayed > 60 * 1000 &&
    !game.playerIDs.includes(substitutionPlayerID) &&
    game.privateTournamentId == null &&
    game.publicTournamentId == null
  )
}

// Ordinary move or teufel
function playerShouldPlay(game: GameForPlay, playerIndexToSubstitute: number): boolean {
  return game.game.activePlayer === playerIndexToSubstitute && !game.game.narrFlag.some((f) => f) && !game.game.tradeFlag
}

// Could be narr or trade
function playerShouldTrade(game: GameForPlay, playerIndexToSubstitute: number): boolean {
  if (playerIndexToSubstitute >= game.nPlayers) return false
  return (game.game.narrFlag.some((f) => f) && !game.game.narrFlag[playerIndexToSubstitute]) || (game.game.tradeFlag && game.game.tradedCards[playerIndexToSubstitute] == null)
}

export async function startSubstitution(pgPool: pg.Pool, game: GameForPlay, substitutionPlayerID: number, playerIndexToSubstitute: number): Promise<Result<null, GetUserErrors>> {
  const user = await getUser(pgPool, { id: substitutionPlayerID })
  if (user.isErr()) {
    return err(user.error)
  }

  game.substitution = {
    substitutionUserID: substitutionPlayerID,
    substitutionUsername: user.value.username,
    playerIndexToSubstitute: playerIndexToSubstitute,
    acceptedByIndex: [],
    startDate: Date.now(),
  }
  setSubstitution(game.id, game.substitution)
  sendUpdatesOfGameToPlayers(game)

  addJob(
    scheduleJob(Date.now() + MAX_TIME_FOR_SUBSTITUTION, () => {
      checkSubstitutionsForTime(pgPool)
    })
  )
  return ok(null)
}

export type AcceptSubstitutionError = 'NO_ACTIVE_SUBSTITUTION' | 'SUBSTITUTION_ALREADY_ACCEPTED' | 'CANNOT_ACCEPT_OWN_SUBSTITUTION' | 'PLAYER_NOT_IN_GAME'
export async function acceptSubstitution(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<null, AcceptSubstitutionError>> {
  if (game.substitution == null) {
    return err('NO_ACTIVE_SUBSTITUTION')
  }

  const playerIndex = game.playerIDs.findIndex((id) => id === userID)
  if (playerIndex < 0 || playerIndex >= game.nPlayers) {
    return err('PLAYER_NOT_IN_GAME')
  }

  if (game.substitution.acceptedByIndex.includes(playerIndex)) {
    return err('SUBSTITUTION_ALREADY_ACCEPTED')
  }

  if (game.substitution.playerIndexToSubstitute === playerIndex) {
    return err('CANNOT_ACCEPT_OWN_SUBSTITUTION')
  }

  game.substitution.acceptedByIndex.push(playerIndex)
  if (game.substitution.acceptedByIndex.length >= game.game.nPlayers - 1) {
    const playerIndexAdditional = game.game.statistic.length
    if (game.substitution.playerIndexToSubstitute === -1) {
      throw new Error('Substitution failed as playerIndex could not be found')
    }

    game.game.substitutedPlayerIndices.push(game.substitution.playerIndexToSubstitute)

    // handle statistics
    game.game.statistic.push(initalizeStatistic(1)[0])
    ;[game.game.statistic[playerIndexAdditional], game.game.statistic[game.substitution.playerIndexToSubstitute]] = [
      game.game.statistic[game.substitution.playerIndexToSubstitute],
      game.game.statistic[playerIndexAdditional],
    ]

    await pgPool.query('UPDATE users_to_games SET player_index = $1 WHERE userid = $2 AND gameid = $3;', [
      playerIndexAdditional,
      game.playerIDs[game.substitution.playerIndexToSubstitute],
      game.id,
    ])
    await pgPool.query('INSERT INTO users_to_games (player_index, userid, gameid) VALUES ($1, $2, $3);', [
      game.substitution.playerIndexToSubstitute,
      game.substitution.substitutionUserID,
      game.id,
    ])

    getSocketByUserID(game.playerIDs[game.substitution.playerIndexToSubstitute] ?? -1)?.disconnect()
    const newSocket = getSocketByUserID(game.substitution.substitutionUserID)
    if (newSocket != null) {
      newSocket.data.gamePlayer = game.substitution.playerIndexToSubstitute
      newSocket.emit('substitution:changeGamePlayer', game.substitution.playerIndexToSubstitute)
    }
    getSocketsInGame(nsp, game.id).forEach((s) =>
      s.emit('toast:substitution-done', game.substitution?.substitutionUsername ?? '', game.players[game.substitution?.playerIndexToSubstitute ?? 0] ?? '')
    )
    await updateGame(pgPool, game.id, game.game.getJSON(), game.running, true, false)

    game.substitution = null
    setSubstitution(game.id, null)
    game = await getGame(pgPool, game.id)
  }

  setSubstitution(game.id, game.substitution)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export type RejectSubstitutionError = 'NO_RUNNING_SUBSTITUTION' | 'PLAYER_NOT_IN_GAME_AND_NOT_SUBSTITUTION'
export async function rejectSubstitution(game: GameForPlay, userID: number): Promise<Result<null, RejectSubstitutionError>> {
  if (game.substitution == null) {
    return err('NO_RUNNING_SUBSTITUTION')
  }

  const playerIndex = game.playerIDs.findIndex((id) => id === userID)
  if ((playerIndex < 0 || playerIndex >= game.nPlayers) && userID !== game.substitution?.substitutionUserID) {
    return err('PLAYER_NOT_IN_GAME_AND_NOT_SUBSTITUTION')
  }

  game.substitution = null
  setSubstitution(game.id, game.substitution)
  sendUpdatesOfGameToPlayers(game)
  return ok(null)
}

export async function checkSubstitutionsForTime(pgPool: pg.Pool) {
  for (const [key, substitution] of currentSubstitutions) {
    if (Date.now() - substitution.startDate > MAX_TIME_FOR_SUBSTITUTION) {
      currentSubstitutions.delete(key)
      const game = await getGame(pgPool, key)
      sendUpdatesOfGameToPlayers(game)
    }
  }
}
