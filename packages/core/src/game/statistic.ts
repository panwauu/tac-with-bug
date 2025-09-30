import type * as tCard from '../types/card'
import type * as tBall from '../types/ball'
import type * as tStatistic from '../types/statistic'

import { ballPlayer } from './ballUtils'

export function initalizeStatistic(nPlayers: number): tStatistic.GameStatistic[] {
  const initStatistic: tStatistic.GameStatistic[] = []
  for (let i = 0; i < nPlayers; i++) {
    initStatistic.push({
      cards: {
        total: [0, 0, 0],
        '7': [0, 0, 0],
        '1': [0, 0, 0],
        '13': [0, 0, 0],
        '8': [0, 0, 0],
        trickser: [0, 0, 0],
        tac: [0, 0, 0],
        engel: [0, 0, 0],
        teufel: [0, 0, 0],
        krieger: [0, 0, 0],
        narr: [0, 0, 0],
        '4': [0, 0, 0],
      },
      actions: {
        nMoves: 0,
        nBallsLost: 0,
        nBallsKickedEnemy: 0,
        nBallsKickedOwnTeam: 0,
        nBallsKickedSelf: 0,
        timePlayed: 0,
        nAbgeworfen: 0,
        nAussetzen: 0,
      },
    })
  }
  return initStatistic
}

function isTrackedCard(value: string, cards: tStatistic.GameStatisticCardsType): value is keyof tStatistic.GameStatisticCardsType {
  return value in cards
}

export function statisticAnalyseAction(
  move: tBall.MoveTextOrBall,
  ballsBefore: tBall.BallsType,
  ballsAfter: tBall.BallsType,
  aussetzenFlag: boolean,
  teams: number[][],
  deltaTime: number,
  cardsBefore: tCard.CardsType,
  statistic: tStatistic.GameStatistic[],
  narrFlagSave: boolean[],
  teufelFlag: boolean
) {
  const nPlayer: number = move[0]

  // Count nMoves and time (only after the first move)
  statistic[nPlayer].actions.timePlayed += Math.min(deltaTime, 300)
  statistic[nPlayer].actions.nMoves += 1

  // Do not return if confirmation of narr
  if (move[2] === 'narr' && narrFlagSave.includes(true)) {
    return
  }

  // cards
  const cardTitle = cardsBefore.players[(move[0] + (teufelFlag ? 1 : 0)) % cardsBefore.players.length][move[1]]
  if (!cardTitle.includes('-')) {
    if (move[2] === 'tauschen') {
      statistic[nPlayer].cards['total'][2] += 1
    } else {
      statistic[nPlayer].cards['total'][0] += 1
      if (move[2] !== 'abwerfen') {
        statistic[nPlayer].cards['total'][1] += 1
      }
    }

    if (isTrackedCard(cardTitle, statistic[nPlayer].cards)) {
      if (move[2] === 'tauschen') {
        statistic[nPlayer].cards[cardTitle][2] += 1
      } else {
        statistic[nPlayer].cards[cardTitle][0] += 1
        if (move[2] !== 'abwerfen') {
          statistic[nPlayer].cards[cardTitle][1] += 1
        }
      }
    }
  }

  // balls lost/kicked
  for (const [ballIndex, ball] of ballsBefore.entries()) {
    if (ball.state !== 'house' && ballsAfter[ballIndex].state === 'house') {
      const nPlayerLost = ballPlayer(ballIndex)
      const ownTeamIndex = teams.findIndex((team) => team.includes(nPlayer))
      statistic[nPlayerLost].actions.nBallsLost += 1
      if (nPlayerLost === nPlayer) {
        statistic[nPlayer].actions.nBallsKickedSelf += 1
      } else if (teams[ownTeamIndex].includes(nPlayerLost)) {
        statistic[nPlayer].actions.nBallsKickedOwnTeam += 1
      } else {
        statistic[nPlayer].actions.nBallsKickedEnemy += 1
      }
    }
  }

  if (move[2] === 'abwerfen') {
    statistic[nPlayer].actions.nAbgeworfen += 1
  }

  if (aussetzenFlag) {
    statistic[nPlayer].actions.nAussetzen += 1
  }
}
