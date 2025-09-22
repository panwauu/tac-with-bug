import type pg from 'pg'
import type { GameForPlay } from 'tac-core/types/typesDBgame'
import type { GameSocketS, GameNamespace } from '../sharedTypes/GameNamespaceDefinition'

import logger from '../helpers/logger'
import { getCards, getPlayerUpdateFromGame } from 'tac-core/game/serverOutput'
import { performMoveAndReturnGame, getGame } from '../services/game'
import { gameSocketIOAuthentication } from '../helpers/authentication'
import { initializeInfo } from './info'
import { registerSubstitutionHandlers } from './gameSubstitution'
import { endSubstitutionIfRunning, endSubstitutionsByUserID } from '../services/substitution'
import { MoveTextOrBall } from 'tac-core/types/typesBall'
import { getAiData } from 'tac-core/bot/simulation/output'
import { projectMoveToGamePlayer } from 'tac-core/bot/normalize/normalize'
import { getBotMove } from 'tac-core/bot/bots/bots'
import { sleep } from '../helpers/sleep'

export let nsp: GameNamespace

export function registerSocketNspGame(nspGame: GameNamespace, pgPool: pg.Pool) {
  nsp = nspGame

  const runBots = true
  const getBotMoveCyclic = async () => {
    while (runBots) {
      try {
        await CallBot(pgPool, nspGame)
      } catch (err) {
        logger.error(err)
        logger.error('AI callback failed')
      }
      await sleep(200)
    }
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') getBotMoveCyclic()

  nspGame.use(gameSocketIOAuthentication)

  nspGame.use(async (socket, next) => {
    try {
      const gameID = parseInt(socket.handshake.auth.gameID as string)
      const game = await getGame(pgPool, gameID)
      const gamePlayer =
        socket.data.userID != null && game.playerIDs.findIndex((id) => id === socket.data.userID) < game.nPlayers ? game.playerIDs.findIndex((id) => id === socket.data.userID) : -1

      socket.data.gameID = gameID
      socket.data.gamePlayer = gamePlayer
      ;[...nspGame.sockets.values()]
        .filter((e) => e.data.userID != null && e.data.userID === socket.data.userID && e.data.gameID === socket.data.gameID)
        .forEach((s) => {
          s.disconnect()
        })

      return next()
    } catch (err) {
      logger.error('Error in game Namespace Authorization', err)
      return next(new Error('Not Authorized'))
    }
  })

  nspGame.on('connection', async (socket) => {
    if (socket.data.gameID == null || socket.data.gamePlayer == null) {
      socket.disconnect()
      return
    }

    const game = await getGame(pgPool, socket.data.gameID)
    socket.emit('update', getPlayerUpdateFromGame(game, socket.data.gamePlayer))
    await dealCardsIfNecessary(pgPool, nspGame, socket.data.gamePlayer, game)

    emitOnlinePlayersEvents(pgPool, nspGame, socket.data.gameID)

    logger.info(`User joined game: ${socket.data.userID} has joined ${socket.data.gameID} as ${socket.data.gamePlayer}`)

    socket.on('disconnect', async () => {
      await emitOnlinePlayersEvents(pgPool, nspGame, socket.data.gameID ?? 0)
      await endSubstitutionsByUserID(pgPool, socket.data.userID ?? -1)
      logger.info(`User Disconnected: ${socket.data.userID}`)
    })

    socket.on('postMove', async (postMove) => {
      if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) {
        socket.disconnect()
        return
      }

      const game = await performMoveAndReturnGame(pgPool, postMove, socket.data.gamePlayer, socket.data.gameID)
      endSubstitutionIfRunning(game)
      getSocketsInGame(nspGame, socket.data.gameID).forEach((socketIterator) => {
        socketIterator.emit('update', getPlayerUpdateFromGame(game, socketIterator.data.gamePlayer ?? -1))
      })
      await dealCardsIfNecessary(pgPool, nspGame, socket.data.gamePlayer, game)
    })

    registerSubstitutionHandlers(pgPool, socket)
  })
}

export async function emitOnlinePlayersEvents(pgPool: pg.Pool, nsp: GameNamespace, gameID: number) {
  const socketsInGame = getSocketsInGame(nsp, gameID)

  const onlineGamePlayers = socketsInGame.map((s) => s.data.gamePlayer).filter((v) => v != null && v >= 0) as number[]

  const watchingSockets = socketsInGame.filter((s) => {
    return s.data.gamePlayer == null || s.data.gamePlayer < 0
  })
  const nWatchingPlayers = watchingSockets.length
  const watchingPlayerIDs = watchingSockets.map((s) => s.data.userID) as number[]
  const res = await pgPool.query('SELECT username FROM users WHERE id = ANY($1::int[])', [watchingPlayerIDs])
  const watchingPlayerNames = res.rows.map((r) => r.username)

  socketsInGame.forEach((s) => {
    s.emit('game:online-players', { onlineGamePlayers, nWatchingPlayers, watchingPlayerNames })
  })

  initializeInfo()
}

async function dealCardsIfNecessary(pgPool: pg.Pool, nsp: GameNamespace, gamePlayer: number, game: GameForPlay) {
  if (game.running && game.game.gameEnded === false && !game.game.cards.players.some((player) => player.length > 0)) {
    const timeSinceLastPlayed = new Date().getTime() - new Date(game.lastPlayed).getTime()
    const delay = Math.max(Math.min(2000 - timeSinceLastPlayed, 2000), 0)

    const newGame = await performMoveAndReturnGame(pgPool, 'dealCards', gamePlayer, game.id)
    setTimeout(async () => {
      getSocketsInGame(nsp, game.id).forEach((s) => {
        s.emit('update', getPlayerUpdateFromGame(newGame, s.data.gamePlayer ?? -1))
      })
    }, delay)
  }
}

export function getSocketsInGame(nspGame: GameNamespace, gameID: number): GameSocketS[] {
  return [...nspGame.sockets.values()].filter((s) => s.data.gameID === gameID)
}

export function getSocketByUserID(userID: number): GameSocketS | undefined {
  return [...nsp.sockets.values()].find((s) => s.data.userID === userID)
}

export function getPlayerIDsOfGame(gameID: number): number[] {
  return getSocketsInGame(nsp, gameID)
    .map((s) => s.data.userID)
    .filter((v) => v != null) as number[]
}

export function isPlayingInGame(userID: number, gameID: number) {
  return [...nsp.sockets.values()].find((s) => s.data.userID === userID && s.data.gameID === gameID) != null
}

export function sendUpdatesOfGameToPlayers(game: GameForPlay) {
  getSocketsInGame(nsp, game.id).forEach((socket) => {
    socket.emit('update', getPlayerUpdateFromGame(game, socket.data.gamePlayer ?? -1))
  })
}

const BOT_TIME_TO_WAIT = 4000 as const
const BOT_TIME_TO_WAIT_NARR = 0 as const
const BOT_TIME_TO_WAIT_7 = 1500 as const

async function CallBot(pgPool: pg.Pool, nspGame: GameNamespace) {
  const gameIDs: number[] = []
  for (const socket of nsp.sockets) {
    if (socket[1].data.gameID != null && !gameIDs.includes(socket[1].data.gameID)) {
      gameIDs.push(socket[1].data.gameID)
    }
  }

  for (const gameID of gameIDs) {
    const game = await getGame(pgPool, gameID)
    if (
      !game.running ||
      !(
        Date.now() - game.lastPlayed > BOT_TIME_TO_WAIT ||
        (Date.now() - game.lastPlayed > BOT_TIME_TO_WAIT_7 && game.game.cardsWithMoves.some((c) => c.title.includes('-'))) ||
        (Date.now() - game.lastPlayed > BOT_TIME_TO_WAIT_NARR && game.game.cardsWithMoves.every((c) => c.textAction === 'narr'))
      )
    ) {
      continue
    }

    const start = performance.now()

    let move: MoveTextOrBall | null = null
    const botIndices = game.bots.map((bot, i) => (bot != null ? i : null)).filter((i) => i != null) as number[]
    for (const gamePlayer of botIndices) {
      const cards = getCards(game.game, gamePlayer)
      if (cards.length !== 0 && game.game.narrFlag.some((f) => f) && !game.game.narrFlag[gamePlayer]) {
        move = [gamePlayer, 0, 'narr']
        break
      }
      if (cards.every((c) => !c.possible)) {
        continue
      }

      const agentMove = getBotMove(game.bots[gamePlayer] ?? 3, getAiData(game.game, gamePlayer))
      move = projectMoveToGamePlayer(game.game, agentMove, gamePlayer)
      logger.info(`Bot took ${performance.now() - start}ms`)
      break
    }

    if (move != null) {
      const game = await performMoveAndReturnGame(pgPool, move, move[0], gameID)
      getSocketsInGame(nspGame, gameID).forEach((socketIterator) => {
        socketIterator.emit('update', getPlayerUpdateFromGame(game, socketIterator.data.gamePlayer ?? -1))
      })
      await dealCardsIfNecessary(pgPool, nspGame, game.game.activePlayer, game)
    }
  }
}
