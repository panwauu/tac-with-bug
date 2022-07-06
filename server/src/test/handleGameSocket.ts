import { io } from 'socket.io-client';
import { GameSocketC } from '../../../shared/types/GameNamespaceDefinition';
import { connectSocket } from './handleSocket';

export function initiateGameSocket(gameID: number | string, token: string): GameSocketC {
    return io('http://localhost:1234/game', { auth: { gameID: gameID, token: token }, forceNew: true, autoConnect: false }) as any;
}

export async function registerGameSocket(gameID: number | string, token: string): Promise<GameSocketC> {
    const gameSocket: GameSocketC = initiateGameSocket(gameID, token)
    await connectSocket(gameSocket)
    return gameSocket
}
