import type pg from 'pg'
import type { GameForPlay, MoveTextOrBall } from '@repo/core/types'
import type { GameSocketS, GameNamespace } from '../sharedTypes/GameNamespaceDefinition'

import logger from '../helpers/logger'
import { getCards, getPlayerUpdateFromGame } from '@repo/core/game/serverOutput'
import { performMoveAndReturnGame, getGame } from '../services/game'
import { gameSocketIOAuthentication } from '../helpers/authentication'
import { initializeInfo } from './info'
import { registerSubstitutionHandlers } from './gameSubstitution'
import { endSubstitutionIfRunning, endSubstitutionsByUserID } from '../services/substitution'
import { getAiData } from '@repo/core/bot/simulation/output'
import { projectMoveToGamePlayer } from '@repo/core/bot/normalize/normalize'
import { getBotMove } from '@repo/core/bot/bots/bots'
import { stufeFuerPartie } from '@repo/core/bot/netz/onlineStufen'
import { kiZug } from '../services/kiServer'
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
      const gameID = Number.parseInt(socket.handshake.auth.gameID as string)
      const game = await getGame(pgPool, gameID)
      const gamePlayer = socket.data.userID != null && game.playerIDs.indexOf(socket.data.userID) < game.nPlayers ? game.playerIDs.indexOf(socket.data.userID) : -1

      socket.data.gameID = gameID
      socket.data.gamePlayer = gamePlayer
      for (const s of [...nspGame.sockets.values()].filter((e) => e.data.userID != null && e.data.userID === socket.data.userID && e.data.gameID === socket.data.gameID)) {
        s.disconnect()
      }

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
      for (const socketIterator of getSocketsInGame(nspGame, socket.data.gameID)) {
        socketIterator.emit('update', getPlayerUpdateFromGame(game, socketIterator.data.gamePlayer ?? -1))
      }
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

  for (const s of socketsInGame) {
    s.emit('game:online-players', { onlineGamePlayers, nWatchingPlayers, watchingPlayerNames })
  }

  initializeInfo()
}

function cardsHaveToBeDealt(game: GameForPlay): boolean {
  return game.running && game.game.gameEnded === false && !game.game.cards.players.some((player) => player.length > 0)
}

/** Partien, in denen gerade ausgeteilt wird: jeder Socket plant das Austeilen, es darf aber nur einmal passieren */
const austeilenInArbeit = new Set<number>()

async function dealCardsIfNecessary(pgPool: pg.Pool, nsp: GameNamespace, gamePlayer: number, game: GameForPlay) {
  if (cardsHaveToBeDealt(game)) {
    const timeSinceLastPlayed = Date.now() - new Date(game.lastPlayed).getTime()
    const delay = Math.max(Math.min(2000 - timeSinceLastPlayed, 2000), 0)

    setTimeout(async () => {
      if (austeilenInArbeit.has(game.id)) return
      austeilenInArbeit.add(game.id)
      try {
        // Die Partie kann inzwischen ausgeteilt oder durch eine Ersetzung veraendert worden sein
        if (!cardsHaveToBeDealt(await getGame(pgPool, game.id))) return

        const newGame = await performMoveAndReturnGame(pgPool, 'dealCards', gamePlayer, game.id)
        for (const s of getSocketsInGame(nsp, game.id)) {
          if (!s.disconnected) {
            s.emit('update', getPlayerUpdateFromGame(newGame, s.data.gamePlayer ?? -1))
          }
        }
      } catch (err) {
        logger.error('Error dealing cards:', err)
      } finally {
        austeilenInArbeit.delete(game.id)
      }
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
  return [...nsp.sockets.values()].some((s) => s.data.userID === userID && s.data.gameID === gameID)
}

export function sendUpdatesOfGameToPlayers(game: GameForPlay) {
  for (const socket of getSocketsInGame(nsp, game.id)) {
    socket.emit('update', getPlayerUpdateFromGame(game, socket.data.gamePlayer ?? -1))
  }
}

const BOT_TIME_TO_WAIT = 4000 as const
const BOT_TIME_TO_WAIT_NARR = 0 as const
const BOT_TIME_TO_WAIT_7 = 1500 as const

/** Zug eines Bots: KI-Stufe der App im eigenen Thread, sonst Oskars Bots. */
async function botZug(game: GameForPlay, gamePlayer: number): Promise<MoveTextOrBall> {
  const botID = game.bots[gamePlayer] ?? 3
  const stufe = stufeFuerPartie(botID, game.game.nPlayers, game.game.teams.length, game.game.coop)
  const daten = getAiData(game.game, gamePlayer)
  return stufe != null ? kiZug(game.id, gamePlayer, stufe, daten) : getBotMove(botID, daten)
}

/** Partien, in denen gerade ein Bot rechnet oder zieht: die Schleife ueberspringt sie. */
const botInArbeit = new Set<number>()

async function CallBot(pgPool: pg.Pool, nspGame: GameNamespace) {
  const gameIDs: number[] = []
  for (const socket of nsp.sockets) {
    if (socket[1].data.gameID != null && !gameIDs.includes(socket[1].data.gameID)) {
      gameIDs.push(socket[1].data.gameID)
    }
  }

  for (const gameID of gameIDs) {
    if (botInArbeit.has(gameID)) {
      continue
    }
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

    // Der Bot zieht nebenher: rechnet eine KI, warten die anderen Partien nicht darauf.
    botInArbeit.add(gameID)
    void botZiehtIn(pgPool, nspGame, game)
      .catch((err) => {
        logger.error(err)
        logger.error('AI callback failed')
      })
      .finally(() => botInArbeit.delete(gameID))
  }
}

async function botZiehtIn(pgPool: pg.Pool, nspGame: GameNamespace, game: GameForPlay) {
  const gameID = game.id
  const start = performance.now()

  let move: MoveTextOrBall | null = null
  // Only the seats: the entries beyond them are the bots that were replaced in this game
  const botIndices = game.bots
    .slice(0, game.nPlayers)
    .map((bot, i) => (bot != null ? i : null))
    .filter((i) => i != null) as number[]
  for (const gamePlayer of botIndices) {
    const cards = getCards(game.game, gamePlayer)
    if (cards.length !== 0 && game.game.narrFlag.some((f) => f) && !game.game.narrFlag[gamePlayer]) {
      move = [gamePlayer, 0, 'narr']
      break
    }
    if (cards.every((c) => !c.possible)) {
      continue
    }

    const agentMove = await botZug(game, gamePlayer)
    move = projectMoveToGamePlayer(game.game, agentMove, gamePlayer)
    logger.info(`Bot took ${performance.now() - start}ms`)
    break
  }

  if (move != null) {
    const nachher = await performMoveAndReturnGame(pgPool, move, move[0], gameID)
    for (const socketIterator of getSocketsInGame(nspGame, gameID)) {
      socketIterator.emit('update', getPlayerUpdateFromGame(nachher, socketIterator.data.gamePlayer ?? -1))
    }
    await dealCardsIfNecessary(pgPool, nspGame, nachher.game.activePlayer, nachher)
  }
}
