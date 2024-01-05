import type { WaitingGame } from '../sharedTypes/typesWaiting'
import type { GameForPlay } from '../sharedTypes/typesDBgame'
import type pg from 'pg'

import { Result, ok, err } from 'neverthrow'
import { colors } from '../sharedDefinitions/colors'
import { createGame, disableRematchOfGame } from './game'
import { isUserOnline } from '../socket/general'
import { expectOneChangeToDatabase, NotOneDatabaseChangeError } from '../dbUtils/dbHelpers'
import { getUser } from './user'
import { validBotIds } from '../bot/bots/bots'
import { switchFromGameOrderToTeamsOrder, switchFromTeamsOrderToGameOrder } from '../game/teamUtils'
import logger from '../helpers/logger'

export async function getWaitingGames(sqlClient: pg.Pool, waitingGameID?: number) {
  const res = await sqlClient.query(
    `SELECT waitinggames.*, 
    p0.username as playername0, 
    p1.username as playername1, 
    p2.username as playername2, 
    p3.username as playername3, 
    p4.username as playername4, 
    p5.username as playername5 
    FROM waitinggames 
    LEFT JOIN users AS p0 ON waitinggames.player0 = p0.id
    LEFT JOIN users AS p1 ON waitinggames.player1 = p1.id
    LEFT JOIN users AS p2 ON waitinggames.player2 = p2.id
    LEFT JOIN users AS p3 ON waitinggames.player3 = p3.id
    LEFT JOIN users AS p4 ON waitinggames.player4 = p4.id
    LEFT JOIN users AS p5 ON waitinggames.player5 = p5.id
    ${waitingGameID != null ? 'WHERE waitinggames.id = $1' : ''};`,
    waitingGameID != null ? [waitingGameID] : []
  )
  const data: WaitingGame[] = []
  res.rows.forEach((row) => {
    const adminIndex = ['player0', 'player1', 'player2', 'player3', 'player4', 'player5'].map((e) => row[e]).indexOf(row.adminplayer)
    data.push({
      id: row.id,
      gameid: row.gameid,
      nPlayers: row.nplayers,
      nTeams: row.nteams,
      meister: row.meister,
      private: row.private,
      admin: ['playername0', 'playername1', 'playername2', 'playername3', 'playername4', 'playername5'].map((e) => row[e])[adminIndex],
      adminID: row.adminplayer,
      bots: row.bots,
      playerIDs: ['player0', 'player1', 'player2', 'player3', 'player4', 'player5'].map((e) => row[e]),
      players: ['playername0', 'playername1', 'playername2', 'playername3', 'playername4', 'playername5'].map((e) => row[e]),
      balls: ['balls0', 'balls1', 'balls2', 'balls3', 'balls4', 'balls5'].map((e) => row[e]),
      ready: ['ready0', 'ready1', 'ready2', 'ready3', 'ready4', 'ready5'].map((e) => row[e]),
    })
  })
  return data
}

export type GetWaitingGameError = 'WAITING_GAME_ID_IS_INVALID'
export async function getWaitingGame(sqlClient: pg.Pool, waitingGameID: number): Promise<Result<WaitingGame, GetWaitingGameError>> {
  const games = await getWaitingGames(sqlClient, waitingGameID)
  if (games.length !== 1) {
    return err('WAITING_GAME_ID_IS_INVALID')
  }
  return ok(games[0])
}

export async function createWaitingGame(sqlClient: pg.Pool, nPlayers: 4 | 6, nTeams: 1 | 2 | 3, meister: boolean, privateSet: boolean, userID: number) {
  const query = 'INSERT INTO waitinggames (nPlayers, nTeams, meister, private, adminPlayer, player0, balls0) VALUES ($1, $2, $3, $4, $5, $6, $7);'
  const values = [nPlayers, nTeams, meister, privateSet, userID, userID, 'red']
  return sqlClient.query(query, values)
}

export type CreateRematchError = 'PLAYER_ALREADY_IN_WAITING_GAME' | 'PLAYER_NOT_ONLINE' | 'REMATCH_NOT_OPEN'
export async function createRematchGame(pgPool: pg.Pool, game: GameForPlay, userID: number): Promise<Result<number, CreateRematchError>> {
  if (!game.rematch_open) {
    return err('REMATCH_NOT_OPEN')
  }

  const waitingGames = await getWaitingGames(pgPool)
  await disableRematchOfGame(pgPool, game.id)
  game.rematch_open = false
  if (waitingGames.some((g) => g.playerIDs.slice(0, game.nPlayers).some((waitingPlayerID) => waitingPlayerID != null && game.playerIDs.includes(waitingPlayerID)))) {
    return err('PLAYER_ALREADY_IN_WAITING_GAME')
  }
  if (game.playerIDs.slice(0, game.nPlayers).some((id) => id != null && !isUserOnline(id))) {
    return err('PLAYER_NOT_ONLINE')
  }

  let nTeams = game.game.teams.length
  if (game.game.coop) {
    nTeams = 1
  }

  const values: any[] = [
    userID,
    game.game.nPlayers,
    nTeams,
    game.game.cards.meisterVersion,
    game.id,
    switchFromGameOrderToTeamsOrder(game.bots.slice(0, game.nPlayers), game.nPlayers, game.nTeams),
  ]

  let ballsStr = ''
  let playersStr = ''
  let valStr = ''
  switchFromGameOrderToTeamsOrder(game.colors.slice(0, game.nPlayers), game.nPlayers, game.nTeams).forEach((color, i) => {
    if (color != null) {
      ballsStr += `, balls${i}`
      values.push(color)
      valStr += `, $${values.length}`
    }
  })
  switchFromGameOrderToTeamsOrder(game.playerIDs.slice(0, game.nPlayers), game.nPlayers, game.nTeams).forEach((id, i) => {
    if (id != null) {
      playersStr += `, player${i}`
      values.push(id)
      valStr += `, $${values.length}`
    }
  })

  const query = `INSERT INTO waitinggames (private, adminplayer, nPlayers, nTeams, meister, gameid, bots ${ballsStr} ${playersStr}) 
    VALUES (true, $1, $2, $3, $4, $5, $6 ${valStr}) RETURNING id;`
  const createRes = await pgPool.query<{ id: number }>(query, values)
  return ok(createRes.rows[0].id)
}

export type MovePlayerError =
  | 'PLAYER_NOT_FOUND_IN_WAITING_GAME'
  | 'PLAYER_NOT_ALLOWED_TO_MOVE'
  | 'PLAYER_CANNOT_BE_MOVED_IN_DIRECTION'
  | GetWaitingGameError
  | NotOneDatabaseChangeError
export async function movePlayer(sqlClient: pg.Pool, waitingGameID: number, usernameToMove: string, up: boolean, userID: number): Promise<Result<null, MovePlayerError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  const playerIndex = game.value.players.indexOf(usernameToMove)
  if (playerIndex === -1) {
    return err('PLAYER_NOT_FOUND_IN_WAITING_GAME')
  }

  if (game.value.adminID !== userID && game.value.playerIDs[playerIndex] !== userID) {
    return err('PLAYER_NOT_ALLOWED_TO_MOVE')
  }

  const secondIndex = playerIndex + (up ? 1 : -1)
  if (secondIndex < 0 || secondIndex >= game.value.nPlayers) {
    return err('PLAYER_CANNOT_BE_MOVED_IN_DIRECTION')
  }

  return executeMovePlayerOrBot(sqlClient, waitingGameID, game.value, playerIndex, secondIndex)
}

export type MoveBotError =
  | 'BOT_INDEX_DOES_NOT_EXIST'
  | 'PLAYER_NOT_ALLOWED_TO_MOVE'
  | 'PLAYER_CANNOT_BE_MOVED_IN_DIRECTION'
  | 'PLAYER_NOT_ALLOWED_TO_MOVING'
  | GetWaitingGameError
  | 'NONE_OR_MORE_THAN_ONE_CHANGES_TO_DATABASE'
export async function moveBot(sqlClient: pg.Pool, waitingGameID: number, botIndexToMove: number, up: boolean, userIDMoving: number): Promise<Result<null, MoveBotError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  if (game.value.bots[botIndexToMove] === null) {
    return err('BOT_INDEX_DOES_NOT_EXIST')
  }

  if (game.value.adminID !== userIDMoving) {
    return err('PLAYER_NOT_ALLOWED_TO_MOVE')
  }

  const secondIndex = botIndexToMove + (up ? 1 : -1)
  if (secondIndex < 0 || secondIndex >= game.value.nPlayers) {
    return err('PLAYER_CANNOT_BE_MOVED_IN_DIRECTION')
  }

  return executeMovePlayerOrBot(sqlClient, waitingGameID, game.value, botIndexToMove, secondIndex)
}

async function executeMovePlayerOrBot(
  sqlClient: pg.Pool,
  waitingGameID: number,
  game: WaitingGame,
  indexOne: number,
  indexTwo: number
): Promise<Result<null, NotOneDatabaseChangeError>> {
  const playerFirst = `player${indexOne}`
  const playerSecond = `player${indexTwo}`
  const ballsFirst = `balls${indexOne}`
  const ballsSecond = `balls${indexTwo}`

  const newBotsArray = structuredClone(game.bots)
  ;[newBotsArray[indexOne], newBotsArray[indexTwo]] = [newBotsArray[indexTwo], newBotsArray[indexOne]]

  let readyToFalse = ''
  ;[0, 1, 2, 3, 4, 5].forEach((n) => {
    readyToFalse += `, ready${n}=false`
  })

  const query = `UPDATE waitinggames SET (${playerFirst}, ${playerSecond}, ${ballsFirst}, ${ballsSecond}) = 
    (${playerSecond}, ${playerFirst}, ${ballsSecond}, ${ballsFirst}), bots = $2 ${readyToFalse} WHERE id=$1;`
  const values = [waitingGameID, newBotsArray]
  const dbRes = await sqlClient.query(query, values)
  if (expectOneChangeToDatabase(dbRes).isErr()) {
    return err('NONE_OR_MORE_THAN_ONE_CHANGES_TO_DATABASE')
  }
  return ok(null)
}

export type ChangeColorError =
  | 'PLAYER_NOT_FOUND_IN_WAITING_GAME'
  | 'PLAYER_NOT_ALLOWED_TO_CHANGE_COLOR'
  | 'COLOR_DOES_NOT_EXIST'
  | 'COLOR_ALREADY_IN_USE'
  | GetWaitingGameError
  | NotOneDatabaseChangeError
export async function changeColor(
  sqlClient: pg.Pool,
  waitingGameID: number,
  usernameToChange: string,
  color: string,
  userID: number,
  botIndex: number | null
): Promise<Result<null, ChangeColorError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  const playerIndex = botIndex ?? game.value.players.indexOf(usernameToChange)

  if (playerIndex === -1) {
    return err('PLAYER_NOT_FOUND_IN_WAITING_GAME')
  }
  if (userID !== game.value.adminID && game.value.playerIDs[playerIndex] !== userID) {
    return err('PLAYER_NOT_ALLOWED_TO_CHANGE_COLOR')
  }

  if (!colors.includes(color)) {
    return err('COLOR_DOES_NOT_EXIST')
  }
  if (game.value.balls.includes(color)) {
    return err('COLOR_ALREADY_IN_USE')
  }

  const dbRes = await sqlClient.query(`UPDATE waitinggames SET balls${playerIndex}=$2 WHERE id=$1;`, [waitingGameID, color])
  if (expectOneChangeToDatabase(dbRes).isErr()) {
    return err('NONE_OR_MORE_THAN_ONE_CHANGES_TO_DATABASE')
  }
  return ok(null)
}

export type RemovePlayerError = 'PLAYER_NOT_ALLOWED_TO_REMOVE' | 'USER_NOT_FOUND_IN_DB'
export async function removePlayer(sqlClient: pg.Pool, usernameToRemove: string, userIDRemoving: number): Promise<Result<null, RemovePlayerError>> {
  const user = await getUser(sqlClient, { username: usernameToRemove })
  if (user.isErr()) {
    return err(user.error)
  }

  const userIDToRemove = user.value.id
  const waitingGames = await getWaitingGames(sqlClient)

  const p: Promise<pg.QueryResult<any>>[] = []
  for (const waitingGame of waitingGames) {
    if (!waitingGame.playerIDs.includes(userIDToRemove)) {
      continue
    }

    if (userIDToRemove !== userIDRemoving && userIDRemoving !== waitingGame.adminID) {
      return err('PLAYER_NOT_ALLOWED_TO_REMOVE')
    }

    if (waitingGame.gameid != null || waitingGame.playerIDs.filter((id) => id != null).length <= 1) {
      p.push(sqlClient.query('DELETE FROM waitinggames WHERE id=$1;', [waitingGame.id]))
    } else {
      const indexToRemove = waitingGame.playerIDs.findIndex((p) => p === userIDToRemove)
      const newAdminIndex = waitingGame.playerIDs.findIndex((p) => p !== userIDToRemove && p != null)

      if (indexToRemove === -1 || newAdminIndex === -1) {
        throw new Error('Could not remove player as player is not in game or no new admin could be found')
      }
      p.push(
        sqlClient.query(
          `UPDATE waitinggames SET 
                player${indexToRemove}=null, balls${indexToRemove}=null, 
                adminplayer=player${newAdminIndex}, 
                ready0=false, ready1=false, ready2=false, ready3=false, ready4=false, ready5=false WHERE id=$1;`,
          [waitingGame.id]
        )
      )
    }
  }

  await Promise.all(p)
  return ok(null)
}

export type RemoveBotError = 'PLAYER_INDEX_IS_EMPTY' | 'COULD_NOT_REMOVE_BOT' | 'PLAYER_NOT_ALLOWED_TO_REMOVE' | GetWaitingGameError
export async function removeBot(sqlClient: pg.Pool, waitingGameID: number, playerIndex: number, userIDRemoving: number): Promise<Result<null, RemoveBotError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  if (userIDRemoving !== game.value.adminID) {
    return err('PLAYER_NOT_ALLOWED_TO_REMOVE')
  }

  if (game.value.bots[playerIndex] == null) {
    return err('PLAYER_INDEX_IS_EMPTY')
  }

  try {
    await sqlClient.query(
      `UPDATE waitinggames SET bots[$1]=NULL, balls${playerIndex}=NULL, ready0=false, ready1=false, ready2=false, ready3=false, ready4=false, ready5=false WHERE id = $2;`,
      [playerIndex + 1, waitingGameID]
    )
  } catch {
    return err('COULD_NOT_REMOVE_BOT')
  }
  return ok(null)
}

export type AddPlayerError = 'WAITING_GAME_IS_ALREADY_FULL' | 'COULD_NOT_FIND_COLOR_FOR_NEW_PLAYER' | 'COULD_NOT_ADD_PLAYER' | GetWaitingGameError
export async function addPlayer(sqlClient: pg.Pool, waitingGameID: number, userID: number): Promise<Result<null, AddPlayerError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  const insertIndex = game.value.players.findIndex((p, i) => p === null && game.value.bots[i] === null)
  if (insertIndex === -1) {
    return err('WAITING_GAME_IS_ALREADY_FULL')
  }

  const color = colors.find((c) => !game.value.balls.includes(c))
  if (color === undefined) {
    return err('COULD_NOT_FIND_COLOR_FOR_NEW_PLAYER')
  }

  try {
    await sqlClient.query(`UPDATE waitinggames SET player${insertIndex}=$1, balls${insertIndex}=$2 WHERE id = $3;`, [userID, color, waitingGameID])
  } catch {
    return err('COULD_NOT_ADD_PLAYER')
  }
  return ok(null)
}

export type AddBotError =
  | 'PLAYER_INDEX_ALREADY_FULL'
  | 'COULD_NOT_FIND_COLOR_FOR_NEW_PLAYER'
  | 'COULD_NOT_ADD_PLAYER'
  | 'BOT_ID_INVALID'
  | 'PLAYER_NOT_ALLOWED_TO_ADD'
  | GetWaitingGameError
export async function addBot(sqlClient: pg.Pool, waitingGameID: number, botID: number, playerIndex: number, userIDAdding: number): Promise<Result<null, AddBotError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  if (userIDAdding !== game.value.adminID) {
    return err('PLAYER_NOT_ALLOWED_TO_ADD')
  }

  if (game.value.bots[playerIndex] != null || game.value.playerIDs[playerIndex] != null) {
    return err('PLAYER_INDEX_ALREADY_FULL')
  }

  if (!validBotIds.includes(botID)) {
    return err('BOT_ID_INVALID')
  }

  const color = colors.find((c) => !game.value.balls.includes(c))
  if (color === undefined) {
    return err('COULD_NOT_FIND_COLOR_FOR_NEW_PLAYER')
  }

  try {
    await sqlClient.query(`UPDATE waitinggames SET bots[$1]=$2, balls${playerIndex}=$3 WHERE id = $4;`, [playerIndex + 1, botID, color, waitingGameID])
  } catch (errr) {
    logger.error(errr)
    return err('COULD_NOT_ADD_PLAYER')
  }
  return ok(null)
}

export type SetPlayerReadyError = 'WAITING_GAME_IS_NOT_FULL' | 'PLAYER_NOT_FOUND_IN_WAITING_GAME' | GetWaitingGameError
export async function setPlayerReady(sqlClient: pg.Pool, waitingGameID: number, userID: number): Promise<Result<WaitingGame, SetPlayerReadyError>> {
  const game = await getWaitingGame(sqlClient, waitingGameID)
  if (game.isErr()) {
    return err(game.error)
  }

  if (game.value.players.filter((p) => p != null).length + game.value.bots.filter((b) => b != null).length !== game.value.nPlayers) {
    return err('WAITING_GAME_IS_NOT_FULL')
  }

  const playerIndex = game.value.playerIDs.findIndex((p) => p === userID)
  if (playerIndex === -1) {
    return err('PLAYER_NOT_FOUND_IN_WAITING_GAME')
  }

  await sqlClient.query(`UPDATE waitinggames SET ready${playerIndex}=true WHERE id = $1;`, [waitingGameID])

  return getWaitingGame(sqlClient, waitingGameID)
}

export async function deleteWaitingGame(sqlClient: pg.Pool, waitingGameID: number) {
  return sqlClient.query('DELETE FROM waitinggames WHERE id = $1;', [waitingGameID])
}

export async function getPlayersOfWaitingGame(sqlClient: pg.Pool, waitingGameID: number): Promise<number[]> {
  const query = `SELECT player0, player1, player2, player3, player4, player5 FROM waitinggames 
    WHERE player0 = $1 OR player1 = $1 OR player2 = $1 OR player3 = $1 OR player4 = $1 OR player5 = $1;`
  return sqlClient.query(query, [waitingGameID]).then((res) => {
    return res.rowCount === 0 ? [] : Object.values(res.rows[0])
  })
}

export async function createGameFromWaitingGame(sqlClient: pg.Pool, game: WaitingGame) {
  const playersOrdered = switchFromTeamsOrderToGameOrder(game.playerIDs.slice(0, game.nPlayers), game.nPlayers, game.nTeams)
  const botsOrdered = switchFromTeamsOrderToGameOrder(game.bots.slice(0, game.nPlayers), game.nPlayers, game.nTeams)
  const colorsOrdered = switchFromTeamsOrderToGameOrder(game.balls.slice(0, game.nPlayers), game.nPlayers, game.nTeams)
  return createGame(sqlClient, game.nTeams, playersOrdered, botsOrdered, game.meister, game.nTeams === 1, colorsOrdered, undefined, undefined)
}
