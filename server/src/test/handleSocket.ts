import { Socket } from 'socket.io-client';

type SomeKindOfSocket = { socket: Socket } | Socket;

export async function connectSocket(socket: Socket): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        socket.connect();
        socket.once('connect', () => { resolve() });
        socket.once('connect_error', () => {
            socket.disconnect();
            reject()
        })
    });
}

export async function waitForGameSocketConnection(gameSocket: Socket) {
    return new Promise<void>((resolve, reject) => {
        gameSocket.on('connect', () => { resolve() })
        gameSocket.on('connect_error', () => {
            gameSocket?.close();
            reject()
        })
    });
}

export async function closeSockets(userWithSocketArray: SomeKindOfSocket[]): Promise<void> {
    for (const userWithSocket of userWithSocketArray) {
        await closeSocket(userWithSocket)
    }
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000)) // TBD - Needed to add this to pass test consistently
}

async function closeSocket(someSocket: SomeKindOfSocket): Promise<void> {
    const socket: Socket = 'socket' in someSocket ? someSocket.socket : someSocket
    if (socket.disconnected) { return; }
    await new Promise((resolve) => {
        socket.once('disconnect', () => {
            socket.removeAllListeners();
            resolve(null);
        });
        socket.disconnect();
    })
}
