import * as tCard from '../../../shared/types/typesCard'
import * as tBall from '../../../shared/types/typesBall'

import { ballStart, ballGoal, ballPlayer } from './ballUtils'
import { ballInLastGoalPosition, sevenReconstructPath } from './performMoveUtils'

export function createCardWithMove(
  cardTitle: tCard.cardType,
  balls: tBall.ballsType,
  player: number,
  activePlayer: number,
  teams: number[][],
  cards: tCard.cardsType,
  coop: boolean,
  sevenChosenPlayer: number | null
) {
  const card: tCard.playerCard = { title: cardTitle, possible: false, ballActions: {}, textAction: '' }
  if (player !== activePlayer) {
    return card
  }

  if (cardTitle === 'tac') {
    throw new Error('cannot createCardWithMove with tac Card')
  }

  let playablePlayers = getPlayablePlayers(balls, player, teams, coop, sevenChosenPlayer)
  if (cardTitle === 'engel') {
    playablePlayers = getPlayablePlayers(balls, (player + 1) % (balls.length / 4), teams, coop, sevenChosenPlayer)
  }

  for (let nBall = 0; nBall < balls.length; nBall++) {
    if (cardTitle === 'trickser') {
      if (!balls.filter((ball) => playablePlayers.includes(ball.player)).some((ball) => ball.position >= ballStart(0, balls) && ball.position < ballGoal(0, balls))) {
        continue
      }
    } else if (playablePlayers.includes(balls[nBall].player) === false) {
      continue
    }
    const moves = getMoves(balls, nBall, card.title, teams, coop)
    if (moves !== [] && moves.length > 0) {
      card.possible = true
      card.ballActions[nBall] = moves
    }
  }

  if (card.title === 'engel' && card.possible === false) {
    for (let nBall = 0; nBall < balls.length; nBall++) {
      if (playablePlayers.includes(balls[nBall].player) === false) {
        continue
      }
      let moves = getMoves(balls, nBall, '1', teams, coop)
      moves = moves.concat(getMoves(balls, nBall, '13', teams, coop))
      if (moves !== [] && moves.length > 0) {
        card.possible = true
        card.ballActions[nBall] = moves
      }
    }
  }

  if (card.title === 'narr') {
    if (cards.players.filter((_, i) => i !== activePlayer).some((cards) => cards.length > 0)) {
      card.textAction = 'narr'
      card.possible = true
    }
  } else if (card.title === 'teufel') {
    card.textAction = 'teufel'
    card.possible = true
  } else if (
    card.title === '8' &&
    balls.some((ball) => playablePlayers.includes(ball.player) && ball.position >= ballStart(0, balls) && ball.position < ballGoal(0, balls)) &&
    cards.players[(activePlayer + 1) % cards.players.length].length > 0
  ) {
    card.textAction = 'aussetzen'
    card.possible = true
  }

  return card
}

export function getPlayablePlayers(balls: tBall.ballsType, player: number, teams: number[][], coop: boolean, sevenChosenPlayer: number | null): number[] {
  if (balls.some((ball, index) => ballPlayer(index) === player && ball.state !== 'locked')) {
    return [player]
  }

  let playablePlayers: number[] = []
  teams.forEach((team) => {
    if (team.includes(player)) {
      playablePlayers = team
        .filter((teamPlayer) => teamPlayer !== player)
        .filter((player) => balls.filter((_, nBall) => ballPlayer(nBall) === player).some((ball) => ball.state !== 'locked'))
    }
  })

  if (coop === true && balls.filter((_, index) => playablePlayers.includes(ballPlayer(index))).every((ball) => ball.state === 'locked')) {
    playablePlayers = [...new Set(balls.filter((ball) => ball.state !== 'locked').map((ball) => ball.player))]
  }

  if (sevenChosenPlayer != null && playablePlayers.includes(sevenChosenPlayer)) {
    return [sevenChosenPlayer]
  }

  return playablePlayers
}

export function initializeTeams(nPlayers: number, nTeams: number): number[][] {
  if (nPlayers === 4) {
    return [
      [0, 2],
      [1, 3],
    ]
  } else if (nTeams === 2) {
    return [
      [0, 2, 4],
      [1, 3, 5],
    ]
  } else {
    return [
      [0, 3],
      [1, 4],
      [2, 5],
    ]
  }
}

export function getMoves(balls: tBall.ballsType, nBall: number, cardTitle: string, teams: number[][], coop: boolean): number[] {
  // Not called with tac card

  let movePositions = []

  if (cardTitle === 'narr') {
    return []
  }

  if (cardTitle === 'krieger') {
    movePositions = getKriegerMove(balls, nBall)
  } else if (cardTitle === 'trickser') {
    movePositions = getSwitchingMoves(balls, nBall)
  } else if (cardTitle[0] === '7') {
    let remainingMoves = 7
    if (cardTitle.length > 1) {
      remainingMoves = parseInt(cardTitle.substring(2, cardTitle.length))
    }
    movePositions = getSevenPositions(balls, nBall, remainingMoves, teams, coop)
  } else {
    // Cards that can be moved ordinarily
    movePositions = getMovesLeavingHouse(balls, nBall, cardTitle)
    movePositions = movePositions.concat(getMovingPositions(balls, nBall, cardTitle))
  }

  return movePositions
}

export function getKriegerMove(balls: tBall.ballsType, nBall: number): number[] {
  if (balls[nBall].position >= ballGoal(0, balls) || balls[nBall].position < ballStart(0, balls)) {
    return []
  }

  const largerPos = []
  const smallerPos = []
  for (let i = 0; i < balls.length; i++) {
    if (balls[i].position >= ballStart(0, balls) && balls[i].position < ballGoal(0, balls)) {
      if (balls[i].position > balls[nBall].position) {
        largerPos.push(balls[i].position)
      } else {
        smallerPos.push(balls[i].position)
      }
    }
  }
  const positions = [
    ...largerPos.sort(function (a, b) {
      return a - b
    }),
    ...smallerPos.sort(function (a, b) {
      return a - b
    }),
  ]

  return [positions[0]]
}

export function getSwitchingMoves(balls: tBall.ballsType, nBall: number): number[] {
  if (balls[nBall].position >= ballGoal(0, balls) || balls[nBall].position < ballStart(0, balls)) {
    return []
  }

  const resultingPositions = []
  for (let i = 0; i < balls.length; i++) {
    if (i === nBall) {
      continue
    }
    if (balls[i].position < ballGoal(0, balls) && balls[i].position >= ballStart(0, balls)) {
      resultingPositions.push(balls[i].position)
    }
  }
  return resultingPositions
}

export function getMovesLeavingHouse(balls: tBall.ballsType, nBall: number, cardTitle: tCard.cardType) {
  if ((cardTitle === '1' || cardTitle === '13' || cardTitle === 'engel') && balls[nBall].state === 'house' && balls[nBall].position < ballStart(0, balls)) {
    return [ballStart(nBall, balls)]
  }
  return []
}

export function getSevenPositions(balls: tBall.ballsType, nBall: number, remainingMoves: number, teams: number[][], coop: boolean): number[] {
  let startNodes = [balls[nBall].position]
  let endNodes: number[] = []
  let endAndInterimsNodes: number[] = []
  for (let move = 0; move < remainingMoves; move++) {
    endNodes = []
    for (let i = 0; i < startNodes.length; i++) {
      endNodes = endNodes.concat(moveOneStep(balls, nBall, startNodes[i], 1, 7))
    }
    endNodes = [...new Set(endNodes)]

    // Remove Nodes in Goal that are already occupied
    endNodes = endNodes.filter((position) => position < ballGoal(0, balls) || !balls.some((ball) => ball.position === position))

    // Remove starting position of ball
    endNodes = endNodes.filter((position) => position !== balls[nBall].position)

    // Remove first goal position if 7 is not done and no other balls movable
    if (
      move + 1 !== remainingMoves && // Not last move
      // Last ball of a certain player
      balls
        .filter((_, ballIndex) => {
          return ballPlayer(ballIndex) === ballPlayer(nBall) && ballIndex !== nBall
        })
        .every((ball) => {
          return ballInLastGoalPosition(
            balls,
            balls.findIndex((b) => b.position === ball.position),
            ball.position
          )
        }) &&
      endNodes.some((position) => position === ballGoal(nBall, balls))
    ) {
      // last Goal Position is contained in endNodes
      const pathToGoal = sevenReconstructPath(balls, nBall, ballGoal(nBall, balls))

      const aux = teams.find((team) => team.includes(balls[nBall].player))
      if (aux === undefined) {
        throw new Error('Could not find Team')
      }
      const ownTeam = aux
      let otherTeamBalls = balls.filter((ball, ballIterator) => {
        return ballPlayer(nBall) !== ballPlayer(ballIterator) && ownTeam.includes(ball.player)
      })

      if (coop === true && otherTeamBalls.every((ball) => ball.state === 'locked' || ball.state === 'goal')) {
        otherTeamBalls = balls.filter((_, ballIterator) => ballPlayer(nBall) !== ballPlayer(ballIterator) && !ownTeam.includes(ballPlayer(ballIterator)))
      }

      // remove all other balls of the team that would be remove during the move
      otherTeamBalls = otherTeamBalls.filter((ball) => !pathToGoal.includes(ball.position))

      if (
        otherTeamBalls.every((ball) => {
          return ball.state === 'locked' || ball.state === 'house'
        })
      ) {
        endNodes = endNodes.filter((position) => position !== ballGoal(nBall, balls))
      }
    }

    endAndInterimsNodes = endAndInterimsNodes.concat(endNodes)
    startNodes = [...endNodes]
  }

  return [...new Set(endAndInterimsNodes)]
}

export function getMovingPositions(balls: tBall.ballsType, nBall: number, cardTitle: tCard.cardType): number[] {
  const cardTitleNumber = parseInt(cardTitle)
  const direction = cardTitle === '4' ? -1 : 1

  let startNodes = [balls[nBall].position]
  let endNodes: number[] = []
  for (let move = 0; move < cardTitleNumber; move++) {
    endNodes = []
    for (let i = 0; i < startNodes.length; i++) {
      endNodes = endNodes.concat(moveOneStep(balls, nBall, startNodes[i], direction, cardTitleNumber))
    }
    if (move + 1 !== cardTitleNumber) {
      endNodes = endNodes.filter((position) => !balls.some((ball) => ball.position === position))
    } else {
      // in Goal also remove positions that are occupied
      endNodes = endNodes.filter((position) => position < ballGoal(0, balls) || !balls.some((ball) => ball.position === position))
    }
    startNodes = [...endNodes]
  }

  return endNodes
}

export function moveOneStep(balls: tBall.ballsType, nBall: number, ballPosition: number, direction: number, cardNumber: number): number[] {
  if (ballPosition < ballStart(0, balls)) {
    return []
  }

  const resultingPositions = []
  if (direction === 1) {
    // FORWARD MOVEMENT
    if (
      ballPosition === ballStart(nBall, balls) && // move into goal if allowed
      balls[nBall].state === 'valid'
    ) {
      resultingPositions.push(ballGoal(nBall, balls))
    }

    // perform ordinary move
    if (ballPosition < ballGoal(0, balls)) {
      // not in goal
      if (ballPosition === ballGoal(0, balls) - 1) {
        resultingPositions.push(ballStart(0, balls))
      } // close circle
      else {
        resultingPositions.push(ballPosition + 1)
      }
    } else {
      // in goal
      if (cardNumber === 7) {
        if ((balls[nBall].state === 'goal' || balls[nBall].state === 'valid') && ballPosition !== ballGoal(nBall, balls) + 3) {
          resultingPositions.push(ballPosition + 1)
        }

        if (balls[nBall].state === 'goal' && ballPosition !== ballGoal(nBall, balls)) {
          resultingPositions.push(ballPosition - 1)
        }
      } else {
        // move if not in end
        if (ballPosition < ballGoal(nBall, balls) + 3) {
          resultingPositions.push(ballPosition + 1)
        }
      }
    }
  } else {
    // BACKWARDS MOVEMENT - only possible with -4
    if (
      ballPosition === ballStart(nBall, balls) && // move into goal if not first move
      balls[nBall].state === 'valid'
    ) {
      resultingPositions.push(ballGoal(nBall, balls))
    }

    if (ballPosition >= ballGoal(0, balls)) {
      // move in house
      if (ballPosition < ballGoal(nBall, balls) + 3) {
        resultingPositions.push(ballPosition + 1)
      }
    } else {
      // move in circle
      if (ballPosition === ballStart(0, balls)) {
        resultingPositions.push(ballGoal(0, balls) - 1)
      } // close circle
      else {
        resultingPositions.push(ballPosition - 1)
      } // default
    }
  }
  return resultingPositions
}
