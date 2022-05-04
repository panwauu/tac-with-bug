import type { GameSocketC, GeneralSocketC } from '@/services/socket';
import { io } from 'socket.io-client';
import { useRouter, useRoute } from 'vue-router';
import { user, token } from '@/services/useUser';

export function regsiterGeneralSocket(): GeneralSocketC {
    return io('/', {
        auth: { token: token.value },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    }) as GeneralSocketC;
}

export function registerGameSocket(): GameSocketC {
    const router = useRouter()
    const route = useRoute()

    const gameID = parseInt(route.query.gameID as string);

    if (isNaN(gameID) || gameID < 0) {
        router.push({ name: 'Landing' });
    }

    return io('/game', {
        auth: {
            token: user.token,
            gameID: gameID,
        },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    }) as GameSocketC;
}