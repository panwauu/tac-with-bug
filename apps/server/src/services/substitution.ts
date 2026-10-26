import { Result, ok, err } from 'neverthrow'
import type pg from 'pg'
import { getSocketByUserID, getSocketsInGame, nsp, sendUpdatesOfGameToPlayers } from '../socket/game'
import { emitRunningGamesUpdate } from '../socket/games'
import type { GameForPlay, Substitution } from '@repo/core/types'
import { getGame, updateGame } from './game'
import { initalizeStatistic } from '@repo/core/game/statistic'
import { addJob } from './scheduledTasks'
import { scheduleJob } from 'node-schedule'
import { getUser, GetUserErrors } from './user'
import { getBotName } from '@repo/core/bot/names'
import { validBotIds } from '@repo/core/bot/bots/bots'

const MAX_TIME_FOR_SUBSTITUTION = 60 * 1000
// Player index far outside of the seats and archived statistics, only used within a transaction
const PARKING_PLAYER_INDEX = 1000

const currentSubstitutions = new Map<number, Substitution>()

export function getSubstitution(gameID: number) {
  return currentSubstitutions.get(gameID) ?? null
}

function setSubstitution(gameID: number, substitution: Substitution | null) {
  substitution != null ? currentSubstitutions.set(gameID, substitution) : currentSubstitutions.delete(gameID)
}

export function endSubstitutionIfRunning(game: GameForPlay) {
  if (game.substitution?.substitute.userID != null) {
    setSubstitution(game.id, null)
    game.substitution = null
  }
}

export async function endSubstitutionsByUserID(pgPool: pg.Pool, userID: number) {
  for (const [key, substitution] of currentSubstitutions) {
    if (substitution.substitute.userID === userID) {
      setSubstitution(key, null)
      const game = await getGame(pgPool, key)
      sendUpdatesOfGameToPlayers(game)
    }
  }
}

function checkSubstitutionConditions(
  game: GameForPlay,
  playerIndexToSubstitute: number,
  initiatingUserID: number,
  substitutePlayerID: number | null,
  substituteBotID: number | null
): boolean {
  return (
    game.running &&
    game.substitution == null &&
    game.privateTournamentId == null &&
    game.publicTournamentId == null &&
    canBeSubstituted(game, playerIndexToSubstitute) &&
    (playerSubstitutionCondition(game, initiatingUserID, substitutePlayerID, substituteBotID) ||
      botSubstitutionCondition(game, initiatingUserID, substitutePlayerID, substituteBotID))
  )
}

function canBeSubstituted(game: GameForPlay, playerIndexToSubstitute: number): boolean {
  // Only an actual seat can be substituted: the indices beyond the seats hold the replaced players and
  // bots of this game with their archived statistic
  if (playerIndexToSubstitute < 0 || playerIndexToSubstitute >= game.nPlayers) return false

  return (
    (game.playerIDs.at(playerIndexToSubstitute) != null &&
      (playerShouldPlay(game, playerIndexToSubstitute) || playerShouldTrade(game, playerIndexToSubstitute)) &&
      Date.now() - game.lastPlayed > 60 * 1000) ||
    (game.bots.at(playerIndexToSubstitute) != null && game.playerIDs.at(playerIndexToSubstitute) === null)
  )
}

function playerSubstitutionCondition(game: GameForPlay, initiatingUserID: number, substitutePlayerID: number | null, substituteBotID: number | null) {
  // Only the actual seats count: a player who was replaced by a bot keeps his entry in
  // playerIDs at an index >= nPlayers and must still be able to take that seat back.
  return substituteBotID === null && substitutePlayerID != null && initiatingUserID === substitutePlayerID && !game.playerIDs.slice(0, game.nPlayers).includes(substitutePlayerID)
}

function botSubstitutionCondition(game: GameForPlay, initiatingUserID: number, substitutePlayerID: number | null, substituteBotID: number | null) {
  return substituteBotID != null && substitutePlayerID === null && game.playerIDs.slice(0, game.nPlayers).includes(initiatingUserID) && validBotIds().includes(substituteBotID)
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

export type StartSubstitutionError = 'SUBSTITUTION_NOT_ALLOWED' | GetUserErrors
export async function startSubstitution(
  pgPool: pg.Pool,
  game: GameForPlay,
  substitutionPlayerID: number,
  playerIndexToSubstitute: number,
  substitutionBotId: number | null
): Promise<Result<null, StartSubstitutionError>> {
  const user = await getUser(pgPool, { id: substitutionPlayerID })
  if (user.isErr()) {
    return err(user.error)
  }

  if (!checkSubstitutionConditions(game, playerIndexToSubstitute, substitutionPlayerID, substitutionBotId != null ? null : substitutionPlayerID, substitutionBotId)) {
    return err('SUBSTITUTION_NOT_ALLOWED')
  }

  game.substitution = {
    substitute:
      substitutionBotId === null
        ? {
            userID: substitutionPlayerID,
            username: user.value.username,
            botID: null,
            botUsername: null,
          }
        : {
            userID: null,
            username: null,
            botID: substitutionBotId,
            botUsername: getBotName(game.id, playerIndexToSubstitute),
          },
    playerIndexToSubstitute: playerIndexToSubstitute,
    acceptedByIndex: substitutionBotId != null ? [game.playerIDs.indexOf(substitutionPlayerID)] : [],
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

/** Seats the users at the given player indices - the moves may swap indices with each other, so the
 * rows are parked outside of the used range first to never violate the unique index constraint */
async function moveUsersToGameIndices(pgPool: pg.Pool, gameID: number, moves: { userID: number; playerIndex: number }[]) {
  const client = await pgPool.connect()
  try {
    await client.query('BEGIN')
    for (const [i, move] of moves.entries()) {
      await client.query('UPDATE users_to_games SET player_index = $1 WHERE userid = $2 AND gameid = $3;', [PARKING_PLAYER_INDEX + i, move.userID, gameID])
    }
    for (const move of moves) {
      await client.query('INSERT INTO users_to_games (player_index, userid, gameid) VALUES ($1, $2, $3) ON CONFLICT (userid, gameid) DO UPDATE SET player_index = $1;', [
        move.playerIndex,
        move.userID,
        gameID,
      ])
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export type AcceptSubstitutionError = 'NO_ACTIVE_SUBSTITUTION' | 'SUBSTITUTION_ALREADY_ACCEPTED' | 'CANNOT_ACCEPT_OWN_SUBSTITUTION' | 'PLAYER_NOT_IN_GAME'
export async function acceptSubstitution(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<null, AcceptSubstitutionError>> {
  if (game.substitution == null) {
    return err('NO_ACTIVE_SUBSTITUTION')
  }

  const playerIndex = game.playerIDs.indexOf(userID)
  if (playerIndex < 0 || playerIndex >= game.nPlayers) {
    return err('PLAYER_NOT_IN_GAME')
  }

  if (game.substitution.playerIndexToSubstitute === playerIndex) {
    return err('CANNOT_ACCEPT_OWN_SUBSTITUTION')
  }

  if (!game.substitution.acceptedByIndex.includes(playerIndex)) {
    game.substitution.acceptedByIndex.push(playerIndex)
  }

  const playerIndexToSubstitute = game.substitution.playerIndexToSubstitute
  const substitutionOfPlayer = game.playerIDs.at(playerIndexToSubstitute) != null
  const substitutionByPlayer = game.substitution.substitute.userID != null
  // A substitute who was replaced earlier in this game still has his entry outside of the seats and
  // owns the statistic that was archived there. He takes that statistic along to his new seat - no
  // matter which seat he takes - and his archived slot is reused for the seat he takes over.
  const archivedStatisticIndexOfSubstitute = game.substitution.substitute.userID != null ? game.playerIDs.indexOf(game.substitution.substitute.userID) : -1
  const substituteResumesOwnStatistic = archivedStatisticIndexOfSubstitute >= game.nPlayers && archivedStatisticIndexOfSubstitute < game.game.statistic.length
  const substitutionFullyAccepted =
    game.substitution.acceptedByIndex.length >= game.playerIDs.slice(0, game.nPlayers).filter((id) => id != null).length - (substitutionOfPlayer ? 1 : 0)
  if (substitutionFullyAccepted) {
    const archivedStatisticIndex = substituteResumesOwnStatistic ? archivedStatisticIndexOfSubstitute : game.game.statistic.length
    if (substituteResumesOwnStatistic) {
      game.game.substitutedPlayerIndices[archivedStatisticIndex - game.nPlayers] = playerIndexToSubstitute
    } else {
      game.game.substitutedPlayerIndices.push(playerIndexToSubstitute)
      game.game.statistic.push(initalizeStatistic(1)[0])
    }

    // The statistic played on the seat so far is archived and the seat continues with the statistic
    // of the substitute - an empty one for a new substitute, his earlier one if he returns
    ;[game.game.statistic[archivedStatisticIndex], game.game.statistic[playerIndexToSubstitute]] = [
      game.game.statistic[playerIndexToSubstitute],
      game.game.statistic[archivedStatisticIndex],
    ]

    const playerIndexMoves: { userID: number; playerIndex: number }[] = []
    if (substitutionOfPlayer) {
      playerIndexMoves.push({ userID: game.playerIDs[playerIndexToSubstitute] as number, playerIndex: archivedStatisticIndex })
    } else {
      // The bot keeps its entry at the index of its archived statistic, exactly as a replaced player keeps his
      // users_to_games row there. Without it the finished game would no longer show that a bot ever played.
      game.bots[archivedStatisticIndex] = game.bots[playerIndexToSubstitute]
      game.bots[playerIndexToSubstitute] = null
    }

    if (substitutionByPlayer) {
      playerIndexMoves.push({ userID: game.substitution.substitute.userID as number, playerIndex: playerIndexToSubstitute })
    } else {
      game.bots[playerIndexToSubstitute] = game.substitution.substitute.botID
    }

    await moveUsersToGameIndices(pgPool, game.id, playerIndexMoves)

    getSocketByUserID(game.playerIDs[game.substitution.playerIndexToSubstitute] ?? -1)?.disconnect()
    if (game.substitution.substitute.userID != null) {
      const newSocket = getSocketByUserID(game.substitution.substitute.userID)
      if (newSocket != null) {
        newSocket.data.gamePlayer = game.substitution.playerIndexToSubstitute
        newSocket.emit('substitution:changeGamePlayer', game.substitution.playerIndexToSubstitute)
      }
    }
    for (const s of getSocketsInGame(nsp, game.id)) {
      s.emit(
        'toast:substitution-done',
        game.substitution?.substitute?.username ?? game.substitution?.substitute?.botUsername ?? '',
        game.players[game.substitution?.playerIndexToSubstitute ?? 0] ?? ''
      )
    }
    await updateGame(pgPool, game.id, game.game.getJSON(), game.running, true, false, game.bots)

    game.substitution = null
    setSubstitution(game.id, null)
    game = await getGame(pgPool, game.id)

    // The players of a running game changed, so the list of running games changed too
    emitRunningGamesUpdate(pgPool)
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

  const playerIndex = game.playerIDs.indexOf(userID)
  if ((playerIndex < 0 || playerIndex >= game.nPlayers) && userID !== game.substitution.substitute.userID) {
    return err('PLAYER_NOT_IN_GAME_AND_NOT_SUBSTITUTION')
  }

  setSubstitution(game.id, null)
  game.substitution = null
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
