import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';
import type pg from 'pg';
import Joi from 'joi';
import logger from '../helpers/logger';

import { changeColor, deleteWaitingGame, getWaitingGames, removePlayer as removePlayerWaiting, addPlayer, createWaitingGame, movePlayer as movePlayerWaiting, setPlayerReady, createRematchGame } from '../services/waiting';
import { createGame } from '../services/game';
import { getGame } from '../services/game';
import { emitGamesUpdate, emitRunningGamesUpdate } from './games';
import { sendUpdatesOfGameToPlayers } from './game';
import { getUser } from '../services/user';
import { nspGeneral } from './general';
import { transferLatestMessagesToOtherChannel } from '../services/channel';

export async function initializeWaiting(pgPool: pg.Pool, socket: GeneralSocketS) {
    socket.emit('waiting:getGames', await getWaitingGames(pgPool))
}

export async function terminateWaiting(pgPool: pg.Pool, socket: GeneralSocketS) {
    if (socket.data.userID != null) {
        const user = await getUser(pgPool, { id: socket.data.userID })
        if (!user.isErr()) {
            await removePlayerWaiting(pgPool, user.value.username, socket.data.userID)
        }
    }
    nspGeneral.emit('waiting:getGames', await getWaitingGames(pgPool))
}

export async function registerWaitingHandlers(pgPool: pg.Pool, socket: GeneralSocketS) {
    const emitGetGames = async () => {
        const waitingGames = await getWaitingGames(pgPool)
        nspGeneral.emit('waiting:getGames', waitingGames)
    }

    socket.on('waiting:getGames', emitGetGames);

    socket.on('waiting:joinGame', async (gameID) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:joinGame)', { stack: new Error().stack }); return }

        const schema = Joi.number().required().integer().positive();
        const { error } = schema.validate(gameID);
        if (error != null) { logger.error('JOI Error', error); return }

        const user = await getUser(pgPool, { id: socket.data.userID })
        if (user.isErr()) { return }

        await removePlayerWaiting(pgPool, user.value.username, socket.data.userID)
        await addPlayer(pgPool, gameID, socket.data.userID)
        emitGetGames()
    });

    socket.on('waiting:createGame', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:createGame)', { stack: new Error().stack }); return }

        const schema = Joi.object({
            nPlayers: Joi.number().required().valid(4, 6),
            nTeams: Joi.number().required().valid(1, 2, 3),
            meister: Joi.boolean().required(),
            private: Joi.boolean().required(),
        });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        const user = await getUser(pgPool, { id: socket.data.userID })
        if (user.isErr()) { return }

        await removePlayerWaiting(pgPool, user.value.username, socket.data.userID)
        await createWaitingGame(pgPool, data.nPlayers === 4 ? 4 : 6, data.nTeams === 1 ? 1 : data.nTeams === 2 ? 2 : 3, data.meister, data.private, socket.data.userID)
        emitGetGames()
    });

    socket.on('waiting:movePlayer', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:movePlayer)', { stack: new Error().stack }); return }

        const schema = Joi.object({
            gameID: Joi.number().required().integer().positive(),
            username: Joi.string().required(),
            steps: Joi.number().required().integer(),
        });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        await movePlayerWaiting(pgPool, data.gameID, data.username, (data.steps > 0), socket.data.userID)
        emitGetGames()
    });

    socket.on('waiting:removePlayer', async (username) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:removePlayer)', { stack: new Error().stack }); return }

        const schema = Joi.string().required();
        const { error } = schema.validate(username);
        if (error != null) { logger.error('JOI Error', error); return }

        await removePlayerWaiting(pgPool, username, socket.data.userID)
        emitGetGames()
    });

    socket.on('waiting:readyPlayer', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:readyPlayer)', { stack: new Error().stack }); return }

        const schema = Joi.object({ gameID: Joi.number().required().integer().positive() });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        const game = await setPlayerReady(pgPool, data.gameID, socket.data.userID)
        if (game.isErr()) { logger.error(game.error); return }

        if (game.value.ready.every((r, i) => r === true || i >= game.value.nPlayers)) {
            deleteWaitingGame(pgPool, data.gameID)
            const createdGame = await createGameAux(pgPool, game.value.nPlayers, game.value.playerIDs, game.value.nTeams, game.value.meister, game.value.nTeams === 1, game.value.balls)
            await transferLatestMessagesToOtherChannel(pgPool, `g-${createdGame.id}`, `w-${game.value.id}`)
            for (const [, value] of nspGeneral.sockets.entries()) {
                const userID = value.data.userID
                if (userID != null && createdGame.playerIDs.includes(userID)) {
                    value.emit('waiting:startGame', {
                        gameID: createdGame.id,
                        nPlayers: createdGame.nPlayers,
                        gamePlayer: createdGame.playerIDs.findIndex((e) => e === userID),
                    })
                    emitGamesUpdate(pgPool, value)
                }
            }
        }
        emitRunningGamesUpdate(pgPool)
        emitGetGames()
    });

    socket.on('waiting:switchColor', async (data) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:switchColor)', { stack: new Error().stack }); return }

        const schema = Joi.object({
            gameID: Joi.number().required().integer().positive(),
            username: Joi.string().required(),
            color: Joi.string().required(),
        });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        await changeColor(pgPool, data.gameID, data.username, data.color, socket.data.userID)
        emitGetGames()
    });

    socket.on('waiting:createRematch', async (data, cb) => {
        if (socket.data.userID === undefined) { logger.error('Event forbidden for unauthenticated user (waiting:createRematch)', { stack: new Error().stack }); return }

        const schema = Joi.object({ gameID: Joi.number().required().integer().positive() });
        const { error } = schema.validate(data);
        if (error != null) { logger.error('JOI Error', error); return }

        const game = await getGame(pgPool, data.gameID)
        const rematchResult = await createRematchGame(pgPool, game, socket.data.userID)
        sendUpdatesOfGameToPlayers(game)
        if (rematchResult.isErr()) { return cb({ ok: false, error: rematchResult.error }) }
        await transferLatestMessagesToOtherChannel(pgPool, `w-${rematchResult.value}`, `g-${game.id}`)
        emitGetGames()
        return cb({ ok: true, value: null })
    });
}

async function createGameAux(sqlClient: pg.Pool, nPlayers: number, playerIDs: number[], teams: number, meisterVersion: boolean, coop: boolean, colors: string[]) {
    const playersOrdered: number[] = []
    const colorsOrdered: string[] = []
    if (nPlayers === 4) {
        const order = [0, 2, 1, 3]
        order.forEach((pos) => {
            colorsOrdered.push(colors[pos])
            playersOrdered.push(playerIDs[pos])
        })
    } else {
        if (teams === 2) {
            const order = [0, 3, 1, 4, 2, 5]
            order.forEach((pos) => {
                colorsOrdered.push(colors[pos])
                playersOrdered.push(playerIDs[pos])
            })
        } else {
            const order = [0, 2, 4, 1, 3, 5]
            order.forEach((pos) => {
                colorsOrdered.push(colors[pos])
                playersOrdered.push(playerIDs[pos])
            })
        }
    }

    return await createGame(sqlClient, teams, playersOrdered, meisterVersion, coop, colorsOrdered, undefined, undefined)
}
