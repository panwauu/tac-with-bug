import type pg from 'pg';
import type { gameForPlay } from '../../../shared/types/typesDBgame';
import type { GameSocketS, GameNamespace } from '../../../shared/types/GameNamespaceDefinition'

import logger from '../helpers/logger';
import { getPlayerUpdateFromGame } from '../game/serverOutput';
import { performMoveAndReturnGame, getGame } from '../services/game';
import { gameSocketIOAuthentication } from '../helpers/authentication';
import { initializeInfo } from './info';

export let nsp: GameNamespace;

export function registerSocketNspGame(nspGame: GameNamespace, pgPool: pg.Pool) {
    nsp = nspGame;

    nspGame.use(gameSocketIOAuthentication)

    nspGame.use(async (socket, next) => {
        try {
            const gameID = parseInt(socket.handshake.auth.gameID as string)
            const game = await getGame(pgPool, gameID)
            const gamePlayer = socket.data.userID == null ? -1 : game.playerIDs.findIndex((id) => id === socket.data.userID)

            socket.data.gameID = gameID
            socket.data.gamePlayer = gamePlayer;

            [...nspGame.sockets.values()].filter((e) => e.data.userID != null && e.data.userID === socket.data.userID && e.data.gameID === socket.data.gameID).forEach((s) => { s.disconnect() });

            return next();
        } catch (err) {
            logger.error('Error in game Namespace Authorization', err)
            return next(new Error('Not Authorized'));
        }
    });

    nspGame.on('connection', async (socket) => {
        if (socket.data.gameID == null || socket.data.gamePlayer == null) { socket.disconnect(); return }

        const game = await getGame(pgPool, socket.data.gameID)
        socket.emit('update', getPlayerUpdateFromGame(game, socket.data.gamePlayer));
        dealCardsIfNecessary(pgPool, nspGame, socket.data.gamePlayer, game);

        emitOnlinePlayersEvents(pgPool, nspGame, socket.data.gameID)

        logger.info(`User joined game: ${socket.data.userID} has joined ${socket.data.gameID} as ${socket.data.gamePlayer}`)

        socket.on('disconnect', async () => {
            await emitOnlinePlayersEvents(pgPool, nspGame, socket.data.gameID ?? 0)
            logger.info(`User Disconnected: ${socket.data.userID}`)
        });

        socket.on('postMove', async (postMove) => {
            if (socket.data.gameID == null || socket.data.gamePlayer == null || socket.data.userID == null) { socket.disconnect(); return }

            const game = await performMoveAndReturnGame(pgPool, postMove, socket.data.gamePlayer, socket.data.gameID)
            getSocketsInGame(nspGame, socket.data.gameID).forEach((socketIterator) => {
                socketIterator.emit('update', getPlayerUpdateFromGame(game, socketIterator.data.gamePlayer ?? -1))
            })
            dealCardsIfNecessary(pgPool, nspGame, socket.data.gamePlayer, game);
        })
    });
}

async function emitOnlinePlayersEvents(pgPool: pg.Pool, nsp: GameNamespace, gameID: number) {
    const socketsInGame = getSocketsInGame(nsp, gameID)

    const onlineGamePlayers = socketsInGame.map((s) => s.data.gamePlayer).filter((v) => v != null && v >= 0) as number[]

    const watchingSockets = socketsInGame.filter((s) => { return s.data.gamePlayer == null || s.data.gamePlayer < 0 })
    const nWatchingPlayers = watchingSockets.length
    const watchingPlayerIDs = watchingSockets.map((s) => s.data.userID) as number[]
    const res = await pgPool.query('SELECT username FROM users WHERE id = ANY($1::int[])', [watchingPlayerIDs])
    const watchingPlayerNames = res.rows.map((r) => r.username)

    socketsInGame.forEach(s => { s.emit('game:online-players', { onlineGamePlayers, nWatchingPlayers, watchingPlayerNames }); })

    initializeInfo()
}

async function dealCardsIfNecessary(pgPool: pg.Pool, nsp: GameNamespace, gamePlayer: number, game: gameForPlay) {
    if (game.status === 'running' && game.game.gameEnded === false && !game.game.cards.players.some(player => player.length > 0)) {
        const timeSinceLastPlayed = (new Date()).getTime() - (new Date(game.lastPlayed)).getTime()
        const delay = Math.max(Math.min(2000 - timeSinceLastPlayed, 2000), 0)

        const newGame = await performMoveAndReturnGame(pgPool, 'dealCards', gamePlayer, game.id)
        setTimeout(async () => {
            getSocketsInGame(nsp, game.id).forEach((s) => {
                s.emit('update', getPlayerUpdateFromGame(newGame, s.data.gamePlayer ?? -1));
            })
        }, delay)
    }
}

function getSocketsInGame(nspGame: GameNamespace, gameID: number): GameSocketS[] {
    return [...nspGame.sockets.values()].filter((s) => s.data.gameID === gameID)
}

export function getPlayerIDsOfGame(gameID: number): number[] {
    return getSocketsInGame(nsp, gameID).map((s) => s.data.userID).filter((v) => v != null) as number[]
}

export function isPlayingInGame(userID: number, gameID: number) {
    return [...nsp.sockets.values()].find((s) => s.data.userID === userID && s.data.gameID === gameID) != undefined
}

export function sendUpdatesOfGameToPlayers(game: gameForPlay) {
    getSocketsInGame(nsp, game.id).forEach((socket) => {
        socket.emit('update', getPlayerUpdateFromGame(game, socket.data.gamePlayer ?? -1));
    })
}
