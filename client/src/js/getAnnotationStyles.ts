import { calculatePositionPolar } from './buildCells'

export function getCircleHouse(nPlayers: number, playerColors: string[], turned: boolean, nRotation: number): string[] {
  return nPlayers === 6 ? getCircleHouse6(playerColors, turned, nRotation) : getCircleHouse4(playerColors, nRotation)
}

function getCircleHouse4(playerColors: string[], nRotation: number): string[] {
  return [
    `top: 92%; left: 92%; border: solid ${playerColors[(0 + nRotation) % 4]} calc(1.6 / 100 * var(--board-size-in-px));`,
    `top: 92%; left: 7.9%; border: solid ${playerColors[(1 + nRotation) % 4]} calc(1.6 / 100 * var(--board-size-in-px));`,
    `top: 7.86%; left: 7.9%; border: solid ${playerColors[(2 + nRotation) % 4]} calc(1.6 / 100 * var(--board-size-in-px));`,
    `top: 7.86%; left: 92%; border: solid ${playerColors[(3 + nRotation) % 4]} calc(1.6 / 100 * var(--board-size-in-px));`,
  ]
}

function getCircleHouse6(playerColors: string[], turned: boolean, nRotation: number): string[] {
  if (turned === undefined) {
    turned = false
  }
  const aspectRatio = turned ? 0.8658 : 1.155
  const R_house = turned ? 43.27 / aspectRatio : 43.27
  const result = []
  for (let i = 0; i < 6; i++) {
    const position = calculatePositionPolar(50, 50, i * (Math.PI / 3) + (turned ? Math.PI / 6 : 0), R_house, aspectRatio)
    result.push(`border: solid ${playerColors[(i + nRotation) % 6]} calc(1.4 / 100 * var(--board-size-in-px)); left: ${position.left}; top: ${position.top};`)
  }
  return result
}

export function getCircleStart(nPlayers: number, playerColors: string[], nRotation: number): string[] {
  return nPlayers === 6 ? getCircleStart6() : getCircleStart4(playerColors, nRotation)
}

function getCircleStart4(playerColors: string[], nRotation: number): string[] {
  return [
    `top: 95.1%; left: 50%; border: solid ${playerColors[(0 + nRotation) % 4]} calc(1 / 100 * var(--board-size-in-px));`,
    `top: 50%; left: 4.85%; border: solid ${playerColors[(1 + nRotation) % 4]} calc(1 / 100 * var(--board-size-in-px));`,
    `top: 4.85%; left: 50%; border: solid ${playerColors[(2 + nRotation) % 4]} calc(1 / 100 * var(--board-size-in-px));`,
    `top: 50%; left: 95.1%; border: solid ${playerColors[(3 + nRotation) % 4]} calc(1 / 100 * var(--board-size-in-px));`,
  ]
}

function getCircleStart6(): string[] {
  return []
}

export function getPlayerPicture(nPlayers: number, turned: boolean): string[] {
  return nPlayers === 6 ? getPlayerPicture6(turned) : getPlayerPicture4()
}

function getPlayerPicture4(): string[] {
  return ['top: 67.5%; right: 19.5%', 'top: 67.5%; left: 19.2%;', 'top: 26.8%; left: 19.2%;', 'top: 26.8%; right: 19.5%;']
}

function getPlayerPicture6(turned: boolean): string[] {
  if (turned === undefined) {
    turned = false
  }
  return turned === true
    ? [
        'top: 90%; right: 80%;',
        'top: 60%; left: 6.85%; transform: rotate(60deg);',
        'top: 4%; right: 80%;',
        'top: 4%; left: 80%;',
        'top: 60%; right: 6.85%; transform: rotate(-60deg);',
        'top: 90%; left: 80%;',
      ]
    : ['top: 90%; left: 36%;', 'top: 79%; left: 3%;', 'top: 15%; left: 3%;', 'top: 4%; left: 36%;', 'top: 15%; right: 3%;', 'top: 79%; right: 3%;']
}

export function getPlayerCards(nPlayers: number, turned: boolean): string[] {
  return nPlayers === 6 ? getPlayerCards6(turned) : getPlayerCards4()
}

function getPlayerCards4(): string[] {
  return ['top: 67.5%; right: 26.5%;', 'top: 67.5%; left: 26.2%;', 'top: 26.8%; left: 26.2%;', 'top: 26.8%; right: 26.5%;']
}

function getPlayerCards6(turned: boolean): string[] {
  if (turned === undefined) {
    turned = false
  }
  return turned
    ? [
        'bottom: 4%; right: 86%;',
        'bottom: 32.5%; left: 8.65%; transform: rotate(60deg); transform-origin: bottom left;',
        'bottom: 90%; right: 86%;',
        'bottom: 90%; left: 86%;',
        'bottom: 32.5%; right: 8.65%; transform: rotate(-60deg); transform-origin: bottom right;',
        'bottom: 4%; left: 86%;',
      ]
    : ['bottom: 4%; left: 57%;', 'left: 11%; bottom: 15%;', 'left: 11%; top: 15%;', 'top: 4%; left: 57%;', 'right: 11%; top: 15%;', 'right: 11%; bottom: 15%;']
}

export function getPlayerName(nPlayers: number, turned: boolean): string[] {
  return nPlayers === 6 ? getPlayerName6(turned) : getPlayerName4()
}

function getPlayerName4(): string[] {
  return ['top: 74%; right: 19.5%;', 'top: 74%; left: 19.2%;', 'top: 22.3%; left: 19.2%;', 'top: 22.3%; right: 19.5%;']
}

function getPlayerName6(turned: boolean): string[] {
  if (turned === undefined) {
    turned = false
  }
  return turned
    ? [
        'right: 80%; bottom: 0%;',
        'left: 6.2%; bottom: 32.5%; transform: rotate(60deg); transform-origin: top left;',
        'right: 80%; top: 0%;',
        'left: 80%; top: 0%;',
        'right: 6.2%; bottom: 32.5%; transform: rotate(-60deg); transform-origin: top right;',
        'left: 80%; bottom: 0%;',
      ]
    : ['left: 36%; bottom: 0%;', 'left: 3%; bottom: 11%;', 'left: 3%; top: 11%;', 'left: 36%; top: 0%;', 'right: 3%; top: 11%;', 'right: 3%; bottom: 11%;']
}

export function getCoopCardCounter(nPlayers: number, turned: boolean): string {
  if (nPlayers === 4) {
    return 'left: 60%; top: 60%;'
  }
  return turned === true ? 'left: 59.6%; top: 57%;' : 'left: 55%; top: 60%;'
}

export function getDeckPositions(nPlayers: number, turned: boolean): string[] {
  if (nPlayers === 4) {
    return [
      'top: 85%; left: 97%; transform: translate(-100%, -100%);',
      'top: 85%; left: 3%; transform: translate(0, -100%);',
      'top: 15%; left: 3%; transform: translate(0, 0);',
      'top: 15%; left: 97%; transform: translate(-100%, 0);',
    ]
  }
  return turned
    ? [
        'top: 89%; left: 15%; transform: translate(0, -100%);',
        'top: 78%; left: 2%; transform: translate(0, -100%);',
        'top: 11%; left: 15%; transform: translate(0, 0);',
        'top: 11%; left: 85%; transform: translate(-100%, 0);',
        'top: 78%; left: 98%; transform: translate(-100%, -100%);',
        'top: 89%; left: 85%; transform: translate(-100%, -100%);',
      ]
    : [
        'top: 96%; left: 30%; transform: translate(0, -100%);',
        'top: 95.5%; left: 3%; transform: translate(0, -100%);',
        'top: 4.5%; left: 3%; transform: translate(0, 0);',
        'top: 4%; left: 30%; transform: translate(0, 0);',
        'top: 4.5%; left: 97%; transform: translate(-100%, 0);',
        'top: 95.5%; left: 97%; transform: translate(-100%, -100%);',
      ]
}
