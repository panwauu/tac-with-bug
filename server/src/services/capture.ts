import logger from '../helpers/logger'
import * as tBall from '../../../shared/types/typesBall'
import pg from 'pg'
import { game } from '../game/game'
import { cardsType } from '../../../shared/types/typesCard'
import { sanitizeGameCapture } from './gameCaptureSanitation'

export interface capturedType {
  action: tBall.moveType | ['init', number, number, boolean, boolean] | 'reset'
  balls: tBall.ballsType
  cards: cardsType
  activePlayer: number
}

export async function captureMove(sqlClient: pg.Pool, gameID: number, action: tBall.moveType | ['init', number, number, boolean, boolean] | 'reset', game: game) {
  logger.info('Capture')
  const data: capturedType = {
    action: action,
    balls: game.balls,
    cards: game.cards,
    activePlayer: game.activePlayer,
  }

  return DBcaptureGame(sqlClient, gameID, data)
    .then(() => {
      logger.info('Successfully logged Move')
      sanitizeGameCapture(sqlClient, gameID, true)
    })
    .catch((err) => logger.error('Error while Capturing Move', err))
}

export async function DBcaptureGame(sqlClient: pg.Pool, gameID: number, data: capturedType) {
  const query = 'INSERT INTO savegames (id, gameid, game) VALUES ($1, $1, $2) ON CONFLICT (id) DO UPDATE SET game = savegames.game::jsonb || $3'
  const values = [gameID, JSON.stringify([data]), JSON.stringify(data)]
  return sqlClient.query(query, values)
}

export async function insertCompleteCapture(sqlClient: pg.Pool, gameID: number, game: string) {
  const array: capturedType[] = JSON.parse(game)
  if (array.length <= 0) {
    throw new Error('game is empty')
  }
  if (['balls', 'cards', 'action', 'activePlayer'].some((k) => array.some((r: any) => !Object.keys(r).includes(k)))) {
    throw new Error('game misses keys')
  }
  const query = 'INSERT INTO savegames (id, gameid, game) VALUES ($1, $1, $2);'
  return sqlClient.query(query, [gameID, game])
}

export async function retrieveCapturedGame(sqlClient: pg.Pool, gameID: number) {
  const query = 'SELECT game FROM savegames WHERE id = $1;'
  return sqlClient.query<{ game: capturedType[] }>(query, [gameID])
}

export async function removeCapturedGames(sqlClient: pg.Pool) {
  const query = 'DELETE FROM savegames;'
  return sqlClient.query(query)
}
