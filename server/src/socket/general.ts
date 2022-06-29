import type { GeneralNamespace, GeneralSocketS } from '../../../shared/types/GeneralNamespaceDefinition';
import type pg from 'pg';

import { initializeWaiting, registerWaitingHandlers, terminateWaiting } from './waiting';
import { initializeChat, registerChatHandlers } from './chat';
import { registerTournamentHandler } from './tournament';
import { initializeGames, registerGamesHandler } from './games';
import { initializeTutorial, registerTutorialHandler } from './tutorial';
import { initializeSubscription, registerSubscriptionHandler } from './subscription';
import { initializeFriends, registerFriendsHandlers } from './friends';
import { registerAuthHandlers, logoutSocket } from './authentication';
import { generalSocketIOAuthentication } from '../helpers/authentication';
import { initializeInfo, terminateInfo } from './info';
import { registerTournamentPublicHandler, registerTournamentBus } from './tournamentPublic';
import { registerTournamentPrivateHandler } from './tournamentPrivate';
import { registerChannelHandlers } from './channel';

export let nspGeneral: GeneralNamespace;

export async function registerSocketNspGeneral(nsp: GeneralNamespace, pgPool: pg.Pool) {
    nspGeneral = nsp

    nsp.use(generalSocketIOAuthentication)

    registerTournamentBus()

    nsp.on('connection', async (socket) => {
        socket.on('disconnect', async () => { terminateSocket(pgPool, socket) });

        registerAuthHandlers(pgPool, socket)
        registerWaitingHandlers(pgPool, socket);
        registerChatHandlers(pgPool, socket);
        registerTournamentHandler(pgPool, socket);
        registerTournamentPublicHandler(pgPool, socket);
        registerTournamentPrivateHandler(pgPool, socket);
        registerGamesHandler(pgPool, socket);
        registerTutorialHandler(pgPool, socket);
        registerSubscriptionHandler(pgPool, socket);
        registerFriendsHandlers(pgPool, socket);
        registerChannelHandlers(pgPool, socket);

        initializeSocket(pgPool, socket)
    });
}

export async function initializeSocket(pgPool: pg.Pool, socket: GeneralSocketS) {
    for (const [key, value] of nspGeneral.sockets.entries()) {
        if (key != socket.id && socket.data.userID != null && value.data.userID === socket.data.userID) {
            value.emit('logged_out')
            await logoutSocket(pgPool, value)
        }
    }

    initializeInfo()
    initializeTutorial(pgPool, socket)
    initializeWaiting(pgPool, socket)
    initializeSubscription(pgPool, socket)
    initializeGames(pgPool, socket)
    initializeFriends(pgPool, socket)
    initializeChat(pgPool, socket)
}

export async function terminateSocket(pgPool: pg.Pool, socket: GeneralSocketS) {
    await terminateWaiting(pgPool, socket)
    terminateInfo()
}

export function isUserOnline(userID: number) {
    return [...nspGeneral.sockets.values()].find((s) => s.data.userID === userID) != undefined
}

export function getSocketByUserID(userID: number): GeneralSocketS | undefined {
    return [...nspGeneral.sockets.values()].find((s) => s.data.userID === userID)
}
