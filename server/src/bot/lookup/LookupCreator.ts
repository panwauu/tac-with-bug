import type { BallsType, BallType, MoveTextOrBall } from '../../sharedTypes/typesBall'
import type { PlayerCard } from '../../sharedTypes/typesCard'
import type pg from 'pg'

import { cloneDeep } from 'lodash'
import { Game } from '../../game/game'
import { TacServer } from '../../server'
import { normalizeAction, normalizeGame } from '../normalize/normalize'

test()

export function createLookupKey(gameInst: Game): string {
  let key = ''
  key += gameInst.aussetzenFlag ? '1' : '0'
  key += gameInst.teufelFlag ? '1' : '0'
  key += gameInst.tradeFlag ? '1' : '0'
  key += (gameInst.sevenChosenPlayer ?? 9).toString()
  key += `-${JSON.stringify(gameInst.cards.players[0])}`
  key += `-${ballsToString(gameInst.balls)}`
  key += `-${gameInst.cards.players[0].some((c) => c.substring(0, 3) === 'tac') && !gameInst.tradeFlag ? ballsToString(gameInst.priorBalls) : ''}`
  return key
}

export function encodeActionForLookup(action: MoveTextOrBall, cardsWithMoves: PlayerCard[]) {
  let nAction = -1

  let nTextActions = 0
  cardsWithMoves.forEach((c, cardIndex) => {
    if (c.possible && c.textAction !== '') {
      const textActions = c.textAction.split('+').filter((e) => e !== '')
      textActions.forEach((textAction) => {
        if (action[1] === cardIndex && action.length === 3 && action[2] === textAction) {
          nAction = nTextActions
        }
        nTextActions += 1
      })
    }
  })

  let nBallActions = 0
  cardsWithMoves.forEach((c, cardIndex) => {
    if (c.possible) {
      for (const ballAction in c.ballActions) {
        c.ballActions[ballAction].forEach((ballGoalPos) => {
          if (action[1] === cardIndex && action.length === 4 && action[2] === parseInt(ballAction) && action[3] === ballGoalPos) {
            nAction = nTextActions + nBallActions
          }
          nBallActions += 1
        })
      }
    }
  })

  return { nActions: nBallActions + nTextActions, nPerformed: 1, nAction: nAction }
}

export function decodeActionForLookup(lookupValue: Lookup, cardsWithMoves: PlayerCard[]): MoveTextOrBall {
  const actionIndex = lookupValue.actions.indexOf(Math.max(...lookupValue.actions))

  let nActions = 0
  for (const [cardIndex, c] of cardsWithMoves.entries()) {
    if (c.possible && c.textAction !== '') {
      const textActions = c.textAction.split('+').filter((e) => e !== '')
      for (const textAction of textActions) {
        if (nActions === actionIndex) {
          return [0, cardIndex, textAction]
        }
        nActions += 1
      }
    }
  }

  for (const [cardIndex, c] of cardsWithMoves.entries()) {
    if (c.possible) {
      for (const ballAction in c.ballActions) {
        for (const ballGoalPos of c.ballActions[ballAction]) {
          if (nActions === actionIndex) {
            return [0, cardIndex, parseInt(ballAction), ballGoalPos]
          }
          nActions += 1
        }
      }
    }
  }

  throw new Error('Action could not be decoded')
}

export async function clearLookup(pgPool: pg.Pool) {
  await pgPool.query('DELETE FROM lookup;')
}

export async function saveToLookup(key: string, value: LookupValue, pgPool: pg.Pool) {
  const actionsRes = await queryFromLookup(key, pgPool)
  let actions = actionsRes?.actions ?? null

  if (actions === null) {
    actions = new Array(value.nActions).fill(0)
    actions[value.nAction] += 1
    await pgPool.query('INSERT INTO lookup (key, actions) VALUES($1, $2);', [key, actions])
  } else {
    actions[value.nAction] += 1
    await pgPool.query('UPDATE lookup SET actions = $2 WHERE key = $1;', [key, actions])
  }
}

export async function queryFromLookup(key: string, pgPool: pg.Pool) {
  const res = await pgPool.query<{ actions: number[] }>('SELECT actions FROM lookup WHERE key = $1;', [key])
  return res.rowCount === 0 ? null : { actions: res.rows[0].actions }
}

function ballsToString(ballInst: BallsType) {
  return ballInst.map((b) => ballToString(b)).join(';')
}

function ballToString(ball: BallType) {
  return ball.player.toString() + ball.position.toString() + ball.state
}

interface LookupValue {
  nActions: number
  nPerformed: number
  nAction: number
}

interface Lookup {
  actions: number[]
}

/*
    nPlayers: number;
    nTeams: number;
    coop: boolean;
    // ERSTMAL 4 SPIELER HARDCODE MIT nTEAMS = 2 COOP = FALSE

    aussetzenFlag: boolean;
    teufelFlag: boolean;

    balls: tBall.BallsType;
    priorBalls: tBall.BallsType; -> ONLY WITH TAC

    cards: tCard.CardsType; -> ONLY OWN CARDS cards.players[0] after shift

    sevenChosenPlayer: number | null;

    tradeFlag: boolean;

    narrFlag: boolean[];
    winningTeams: boolean[];
    tradeDirection: number; -> ONLY IF nTeams = 3

    activePlayer: number; -> Needs to be converted
    cardsWithMoves: tCard.PlayerCard[];
    // IRRELEVANT
    gameEnded: boolean;
    statistic: tStatistic.GameStatistic[];
    teams: number[][];
    tradeCards: tCard.CardType[];
*/

async function test() {
  const server = new TacServer()
  await clearLookup(server.pgPool)
  const countRes = await server.pgPool.query('SELECT COUNT(*) as count FROM savegames;')

  for (let i = 0; i < countRes.rows[0].count; i++) {
    try {
      const res = await server.pgPool.query('SELECT * FROM savegames OFFSET $1 LIMIT 1;', [i])
      console.log(`${i}/${countRes.rows[0].count}: ${res.rows[0].id}`)

      const lines = res.rows[0].game

      const gameInst = new Game(lines[0].action[1], lines[0].action[2], lines[0].action[3], lines[0].action[4])
      if (gameInst.nPlayers !== 4 || gameInst.coop) {
        continue
      }

      gameInst.activePlayer = lines[0].activePlayer
      gameInst.cards = cloneDeep(lines[0].cards)
      let priorDeckSize = gameInst.cards.deck.length
      gameInst.updateCardsWithMoves()

      for (let iLine = 1; iLine < lines.length; iLine++) {
        if (
          lines[iLine].action !== 'dealCards' &&
          lines[iLine].action !== 'reset' &&
          !gameInst.teufelFlag &&
          lines[iLine].action[2] !== 'narr' &&
          lines[iLine].action[2] !== 'tauschen'
        ) {
          const normGame = normalizeGame(gameInst, lines[iLine].action[0])
          const normAction = normalizeAction(lines[iLine].action, normGame)
          const lookupkey = createLookupKey(normGame.game)
          const lookupvalue = encodeActionForLookup(normAction, normGame.game.cardsWithMoves)
          await saveToLookup(lookupkey, lookupvalue, server.pgPool)
          const lookup = await queryFromLookup(lookupkey, server.pgPool)
          if (lookup === null) {
            throw new Error('Lookup not existing')
          }
        }

        if (lines[iLine].action !== 'reset') {
          gameInst.performAction(lines[iLine].action, Math.random() * 2)
        } else {
          gameInst.resetGame()
          gameInst.cards.players = cloneDeep(lines[iLine].cards.players)
          gameInst.cards.deck = cloneDeep(lines[iLine].cards.deck)
          gameInst.cards.dealingPlayer = cloneDeep(lines[iLine].cards.dealingPlayer)
          gameInst.activePlayer = cloneDeep(lines[iLine].activePlayer)
        }

        // Change the newly dealt cards if necessary
        if (lines[iLine].action === 'dealCards' && priorDeckSize < lines[iLine].cards.deck.length) {
          gameInst.cards.players = cloneDeep(lines[iLine].cards.players)
          gameInst.cards.deck = cloneDeep(lines[iLine].cards.deck)
          priorDeckSize = gameInst.cards.deck.length
        } else {
          priorDeckSize = gameInst.cards.deck.length
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  await server.destroy()
}
