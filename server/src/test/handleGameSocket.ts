import { io } from 'socket.io-client';
import { connectSocket } from './handleSocket';

export function initiateGameSocket(gameID: number | string, token: string) {
    return io('http://localhost:1234/game', { auth: { gameID: gameID, token: token }, forceNew: true, autoConnect: false });
}

export async function registerGameSocket(gameID: number | string, token: string) {
    const gameSocket = initiateGameSocket(gameID, token)
    await connectSocket(gameSocket)
    return gameSocket
}
