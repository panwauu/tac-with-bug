import { MoveText } from '../../sharedTypes/typesBall'
import { AiData } from '../simulation/output'
import { ballInProximityOfHouse, movesBetweenTwoBallsInRing } from './utils'

export function tradeBot(data: AiData): MoveText {
  const tradeToPlayer = data.tradeDirection === 1 ? data.teams[0].at(1) : data.teams[0].at(-1)
  if (tradeToPlayer == null) throw new Error('Trade to player is null')

  // When i have a card that allows partner to go into goal
  // TODO

  // When partner has no 1/13 and
  //   i have >=2 or
  //   i have more balls in the ring
  //   we have the some number but he has more in proximity
  const cardOneOrThirteenIndex = data.cardsWithMoves.findIndex((c) => c.title === '1' || c.title === '13')
  if (!data.hadOneOrThirteen[tradeToPlayer] && cardOneOrThirteenIndex >= 0) {
    const numberOfOwn1Or13 = data.cardsWithMoves.filter((c) => c.title === '1' || c.title === '13').length
    if (numberOfOwn1Or13 > 1) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInRing = data.balls.filter((b) => b.player === data.gamePlayer && (b.state === 'valid' || b.state === 'invalid')).length
    const numberOfPartnerBallsInRing = data.balls.filter((b) => b.player === tradeToPlayer && (b.state === 'valid' || b.state === 'invalid')).length
    if (numberOfOwnBallsInRing > numberOfPartnerBallsInRing) return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']

    const numberOfOwnBallsInProximity = data.balls.filter((b, i) => b.player === data.gamePlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    const numberOfPartnerBallsInProximity = data.balls.filter((b, i) => b.player === tradeToPlayer && ballInProximityOfHouse(b.position, i, data.balls)).length
    if (numberOfOwnBallsInRing > 0 && numberOfOwnBallsInRing === numberOfPartnerBallsInRing && numberOfOwnBallsInProximity < numberOfPartnerBallsInProximity) {
      return [data.gamePlayer, cardOneOrThirteenIndex, 'tauschen']
    }
  }

  // When i have a card that allows partner to kill enemy in proximity of goal
  // TODO: Does not consider that there might be balls in between
  const partnerBallsInRing = data.balls.filter((b) => b.player === tradeToPlayer && (b.state === 'valid' || b.state === 'invalid'))
  const enemyBallsInProximity = data.balls.filter(
    (b, i) => !data.teams[0].includes(b.player) && (b.state === 'valid' || b.state === 'invalid') && ballInProximityOfHouse(b.position, i, data.balls)
  )
  if (partnerBallsInRing.length > 0 && enemyBallsInProximity.length > 0) {
    for (const ballToKill of enemyBallsInProximity) {
      for (const ballKiller of partnerBallsInRing) {
        const moves = movesBetweenTwoBallsInRing(ballKiller.position, ballToKill.position, data.balls)
        if (moves >= 1 && moves <= 13 && moves !== 4) {
          const cardIndex = data.cardsWithMoves.findIndex((c) => c.title === String(moves))
          if (cardIndex >= 0) return [data.gamePlayer, cardIndex, 'tauschen']
        }
      }
    }
  }

  // When partner has problems in house and i have 7 or 2/3 and it would help
  // TODO: Theroetically, we could have a better solution here and pass exactly the correct card
  //       And we would consider that we limit ourselves
  if (data.balls.filter((b) => b.player === tradeToPlayer && b.state === 'goal').length > 0) {
    const cardSevenIndex = data.cardsWithMoves.findIndex((c) => c.title === '7')
    if (cardSevenIndex >= 0) return [data.gamePlayer, cardSevenIndex, 'tauschen']

    const cardTwoIndex = data.cardsWithMoves.findIndex((c) => c.title === '2')
    if (cardTwoIndex >= 0) return [data.gamePlayer, cardTwoIndex, 'tauschen']

    const cardThreeIndex = data.cardsWithMoves.findIndex((c) => c.title === '3')
    if (cardThreeIndex >= 0) return [data.gamePlayer, cardThreeIndex, 'tauschen']
  }

  return [data.gamePlayer, 0, 'tauschen']
}
