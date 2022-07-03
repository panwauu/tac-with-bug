import { io, Socket } from 'socket.io-client';


export function initiateGameSocket(gameID: number | string, token: string) {
    return io('http://localhost:1234/game', { auth: { gameID: gameID, token: token } });
}

export async function waitForGameSocketConnection(gameSocket: Socket) {
    return new Promise<void>((resolve, reject) => {
        gameSocket.on('connect', () => { resolve() })
        gameSocket.on('connect_error', () => { gameSocket?.close(); reject() })
    });
}

export async function registerGameSocket(gameID: number | string, token: string) {
    const gameSocket = initiateGameSocket(gameID, token)
    await waitForGameSocketConnection(gameSocket)
    return gameSocket
}

export async function unregisterGameSocket(gameSocket: Socket) { gameSocket?.close() }