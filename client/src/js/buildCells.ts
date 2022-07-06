export interface PositionStyle {
  top: string
  left: string
}

export function calculatePositionPolar(left_center: number, top_center: number, angle: number, radius_height: number, aspectRatio: number): PositionStyle {
  return {
    top: `${top_center + Math.cos(angle) * radius_height}%`,
    left: `${left_center + Math.sin(-angle) * radius_height * aspectRatio}%`,
  }
}

export function positionStyles6(turned: boolean | undefined): PositionStyle[] {
  if (turned === undefined) {
    turned = false
  }
  const aspectRatio = turned ? 0.8658 : 1.155
  const R_house = turned ? 43.27 / aspectRatio : 43.27
  const R_ring = turned ? 35.53 / aspectRatio : 35.53
  const R_goal = turned ? 22.18 / aspectRatio : 22.18
  const r_goal = turned ? 6.29 / aspectRatio : 6.29
  const phi_goal = [94, 150, 360 - 150, 360 - 94]
  const r_house = turned ? 2.4 / aspectRatio : 2.4
  const nStepsBetweenStarts = 11
  const nPlayers = 6

  const result = []
  for (let i = 0; i < nPlayers; i++) {
    const startCenter = calculatePositionPolar(50, 50, i * ((2 * Math.PI) / nPlayers) + (turned ? Math.PI / 6 : 0), R_house, aspectRatio)
    for (let j = 0; j < 4; j++) {
      result.push(
        calculatePositionPolar(
          parseFloat(startCenter.left.substring(0, startCenter.left.length - 1)),
          parseFloat(startCenter.top.substring(0, startCenter.top.length - 1)),
          (1 / 4 + j / 2) * Math.PI,
          turned ? r_house / aspectRatio : r_house,
          aspectRatio
        )
      )
    }
  }

  for (let i = 0; i < nPlayers * nStepsBetweenStarts; i++) {
    result.push(calculatePositionPolar(50, 50, 2 * Math.PI * (i / (nPlayers * nStepsBetweenStarts)) + (turned ? Math.PI / 6 : 0), R_ring, aspectRatio))
  }

  for (let i = 0; i < nPlayers; i++) {
    const goalCenter = calculatePositionPolar(50, 50, i * ((2 * Math.PI) / nPlayers) + (turned ? Math.PI / 6 : 0), R_goal, aspectRatio)
    for (let j = 0; j < 4; j++) {
      result.push(
        calculatePositionPolar(
          parseFloat(goalCenter.left.substring(0, goalCenter.left.length - 1)),
          parseFloat(goalCenter.top.substring(0, goalCenter.top.length - 1)),
          (phi_goal[j] / 180) * Math.PI + i * ((2 * Math.PI) / nPlayers) + (turned ? Math.PI / 6 : 0),
          r_goal,
          aspectRatio
        )
      )
    }
  }

  return result
}

function calcWithAngle(angle: number, radius: number): PositionStyle {
  return calculatePositionPolar(50, 50, angle, radius, 1)
}

function calcInStart(positionID: number): PositionStyle {
  const topMiddle = positionID >= 8 ? 8 : 92
  const leftMiddle = positionID >= 4 && positionID < 12 ? 8 : 92

  const leftOffset = positionID % 4 >= 2 ? 2.3 : -2.3
  const topOffset = positionID % 4 >= 1 && positionID % 4 < 3 ? 2.3 : -2.3

  return {
    top: topMiddle + topOffset + '%',
    left: leftMiddle + leftOffset + '%',
  }
}

function calcInEnd(positionID: number): PositionStyle {
  let top = 0
  let left = 0
  switch (positionID) {
    case 80:
      top = 82.2
      left = 49.9
      break
    case 81:
      top = 70.4
      left = 43.1
      break
    case 82:
      top = 66.4
      left = 49.9
      break
    case 83:
      top = 70.4
      left = 56.8
      break
    case 84:
      top = 42.2
      left = 21.8
      break
    case 85:
      top = 46.1
      left = 28.7
      break
    case 86:
      top = 53.9
      left = 28.8
      break
    case 87:
      top = 58
      left = 21.9
      break
    case 88:
      top = 17.7
      left = 50
      break
    case 89:
      top = 29.4
      left = 56.8
      break
    case 90:
      top = 33.5
      left = 50
      break
    case 91:
      top = 29.6
      left = 43.1
      break
    case 92:
      top = 57.9
      left = 77.9
      break
    case 93:
      top = 53.9
      left = 71.2
      break
    case 94:
      top = 46.1
      left = 71.2
      break
    case 95:
      top = 41.9
      left = 77.9
      break
  }

  return {
    top: top + '%',
    left: left + '%',
  }
}

export function buildStyles(radius: number): PositionStyle[] {
  const cells = []
  for (let i = 0; i < 16; i++) {
    cells.push(calcInStart(i))
  }
  for (let i = 0; i < 64; i++) {
    cells.push(calcWithAngle((i / 32) * Math.PI, radius))
  }
  for (let i = 0; i < 16; i++) {
    cells.push(calcInEnd(80 + i))
  }
  return cells
}
