import type pg from 'pg';
import type { GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';

import Joi from 'joi';
import logger from '../helpers/logger';

import { getGamesSummary, getGamesLazy, getRunningGames } from '../services/game';
import { getUser } from '../services/user';
import { nspGeneral } from './general';

export async function emitRunningGamesUpdate(pgPool: pg.Pool, socket?: GeneralSocketS) {
    const games = await getRunningGames(pgPool)
    if (socket != null) { socket.emit('games:getRunningGames', games) }
    else { nspGeneral.emit('games:getRunningGames', games) }
}

export async function emitGamesUpdate(pgPool: pg.Pool, socket: GeneralSocketS) {
    if (socket.data.userID == null) {
        socket.emit('games:getGames', {
            open: 0,
            aborted: 0,
            won: 0,
            lost: 0,
            team: 0,
            history: [],
            runningGames: [],
        })
    }
    else {
        socket.emit('games:getGames', await getGamesSummary(pgPool, socket.data.userID))
    }
}

export async function initializeGames(pgPool: pg.Pool, socket: GeneralSocketS) {
    emitGamesUpdate(pgPool, socket)
    emitRunningGamesUpdate(pgPool, socket)
}

export async function registerGamesHandler(pgPool: pg.Pool, socket: GeneralSocketS) {
    socket.on('games:getSummary', async () => {
        emitGamesUpdate(pgPool, socket)
    });

    socket.on('games:getTableData', async (data, callback) => {
        const schema = Joi.object({
            first: Joi.number().required(),
            limit: Joi.number().required(),
            sortField: Joi.string().valid('created', 'id'),
            sortOrder: Joi.number(),
            username: Joi.string()
        });
        const { error } = schema.validate(data);
        if (error != null) { return callback({ status: 422, error: error }) }

        try {
            let userID = socket.data.userID;
            if (data.username != undefined) {
                const user = await getUser(pgPool, { username: data.username })
                if (user.isErr()) { throw new Error(user.error) }
                userID = user.value.id
            }
            if (userID === undefined) { return callback({ status: 500, error: 'No user found' }) }
            const { games, nEntries } = await getGamesLazy(pgPool, userID, data.first, data.limit, data.sortField, data.sortOrder);

            return callback({ status: 200, data: { games, nEntries } })
        } catch (err) {
            logger.error('Error in games Socket handler', err)
            return callback({ status: 500, error: err })
        }
    });

    socket.on('games:getRunningGames', async (callback) => {
        try {
            return callback({ status: 200, data: await getRunningGames(pgPool) })
        } catch (err) {
            logger.error('Error in games:getRunningGames', err)
            return callback({ status: 500, error: err })
        }
    });
}
