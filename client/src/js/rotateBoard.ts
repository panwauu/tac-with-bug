export function rotatePosition(position: number, nRotation: number, nPlayers: number): number {
    const nPositionsBetweenStart = (nPlayers === 6 ? 11 : 16);

    if (position < 4 * nPlayers) {
        position = (position + (nPlayers - nRotation) * 4) % (4 * nPlayers);
    } else if (position < (4 + nPositionsBetweenStart) * nPlayers) {
        position = (position - 4 * nPlayers + (nPlayers - nRotation) * nPositionsBetweenStart) % (nPositionsBetweenStart * nPlayers) + 4 * nPlayers;
    } else {
        position = (position - (4 + nPositionsBetweenStart) * nPlayers + (nPlayers - nRotation) * 4) % (4 * nPlayers) + (4 + nPositionsBetweenStart) * nPlayers;
    }

    return position
}

export function getNRotation(defaultPosition: [number, number], gamePlayer: number, nPlayers: number): number {
    if (defaultPosition[(nPlayers === 6 ? 1 : 0)] === -1) { return 0 }

    return (gamePlayer - defaultPosition[(nPlayers === 6 ? 1 : 0)] + nPlayers) % nPlayers
}