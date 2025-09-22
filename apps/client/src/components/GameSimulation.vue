<template>
  <div class="game">
    <GameBoard
      :position-styles="positionStyles"
      :misc-state="miscState"
      :balls-state="ballsState"
      :cards-state="cardsState"
      :discard-pile-state="discardPileState"
      :perform-move="performMove"
    />
  </div>
</template>

<script setup lang="ts">
import { Game } from '@repo/core/game/game'
import type { AdditionalInformation } from '@repo/core/bot/simulation/simulation'
import type { MoveTextOrBall } from '@repo/core/types/typesBall'
import { getCards, getPlayerUpdateFromGame } from '@repo/core/game/serverOutput'
import { projectMoveToGamePlayer } from '@repo/core/bot/normalize/normalize'
import { getAiData } from '@repo/core/bot/simulation/output'
import { Bot, getBotMove } from '@repo/core/bot/bots/bots'
import type { GameForPlay, UpdateDataType } from '@repo/core/types/typesDBgame'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useStatistic } from '@/services/compositionGame/useStatistic'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { usePerformMove } from '@/services/compositionGame/usePerformMove'
import { useCards } from '@/services/compositionGame/useCards'
import GameBoard from '@/components/game/GameBoard.vue'

const miscState = useMisc(4)
const positionStyles = usePositionStyles(miscState)
const statisticState = useStatistic()
const discardPileState = useDiscardPile(miscState.gamePlayer)
const ballsState = useBalls()
const cardsState = useCards(ballsState, miscState)
const performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState)

async function updateHandler(updateData: UpdateDataType): Promise<void> {
  miscState.setGamePlayer(updateData.gamePlayer)

  const tacFirstRevertState =
    discardPileState.discardPile.length > 0 &&
    discardPileState.discardPile.length + 1 === updateData.discardPile.length &&
    updateData.discardPile[updateData.discardPile.length - 1].startsWith('tac') &&
    !updateData.discardedFlag &&
    !miscState.players[miscState.gamePlayer].active

  miscState.setFlags(updateData)
  miscState.setDeckInfo(updateData.deckInfo)
  miscState.setCoopCounter(updateData.coopCounter)
  miscState.setTradeDirection(updateData.players, updateData.tradeDirection === 1 ? 1 : -1)
  miscState.setPlayers(updateData.players)
  miscState.setGameRunning(updateData.gameEnded, updateData.running, updateData.players, updateData.winningTeams, updateData.coopCounter, miscState.gamePlayer)
  miscState.setTimestamps(updateData.created, updateData.lastPlayed)
  positionStyles.setBallsColors(updateData.colors)
  statisticState?.setStatistic(updateData, positionStyles.getHexColors())
  discardPileState.updateDiscardPile(updateData.discardPile, updateData.players, updateData.cards, positionStyles)

  if (tacFirstRevertState) {
    ballsState.updateBallsState(ballsState.priorBalls, ballsState.priorBalls)
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(null)
      }, 1200)
    }) // 1.2s are also in CSS for balls
  }
  ballsState.updateBallsState(updateData.balls, updateData.priorBalls)
  cardsState.updateCards(updateData.cards, updateData.ownCards)
}

const delayBetweenMoves = 1500
const bots = [Bot.Raindom, Bot.Raindom, Bot.Raindom, Bot.Raindom]

const game = new Game(4, 2, true, true)
const additionalInformation: AdditionalInformation = {
  hadOneOrThirteen: [],
  tradedCards: [null, null, null, null],
  narrTradedCards: [null, null, null, null],
  previouslyUsedCards: [],
}
const gameForPlay: GameForPlay = {
  id: 0,
  game,
  colors: ['red', 'blue', 'green', 'yellow'],
  rematch_open: false,
  substitution: null,
  running: true,
  nPlayers: 4,
  nTeams: 2,
  coop: false,
  created: new Date().getTime(),
  lastPlayed: new Date().getTime(),
  publicTournamentId: null,
  privateTournamentId: null,
  players: [null, null, null, null],
  bots: [Bot.Raindom, Bot.Raindom, Bot.Raindom, Bot.Raindom],
  playerIDs: [null, null, null, null],
}

async function simulateMove() {
  if (game.cards.players.every((p) => p.length === 0)) {
    additionalInformation.previouslyUsedCards = additionalInformation.previouslyUsedCards.concat(game.cards.discardPile)
    if (game.cards.deck.length >= 98) {
      additionalInformation.previouslyUsedCards = []
    }
    game.performAction('dealCards', 0)
    additionalInformation.tradedCards = game.cards.players.map(() => null)
    additionalInformation.narrTradedCards = game.cards.players.map(() => null)
    additionalInformation.hadOneOrThirteen = game.cards.players.map((p) => p.some((c) => c === '1' || c === '13'))
  }
  game.updateCardsWithMoves()

  let move: MoveTextOrBall | null = null
  for (let gamePlayer = 0; gamePlayer < game.nPlayers; gamePlayer++) {
    const cards = getCards(game, gamePlayer)
    if (cards.length !== 0 && game.narrFlag.some((f) => f) && !game.narrFlag[gamePlayer]) {
      move = [gamePlayer, 0, 'narr']
      additionalInformation.narrTradedCards[gamePlayer] = game.cards.players[gamePlayer]
      break
    }
    if (cards.every((c) => !c.possible)) continue

    const aiData = getAiData(game, gamePlayer)
    const agentMove = getBotMove(bots[gamePlayer], aiData)
    move = projectMoveToGamePlayer(game, agentMove, gamePlayer)

    if (!game.checkMove(move)) {
      console.log('error')
    }
    break
  }

  if (move == null) {
    throw new Error('No move found')
  }
  if (!game.checkMove(move)) {
    throw new Error('Wrong move selected')
  }

  if (move[2] === 'tauschen') {
    additionalInformation.tradedCards[move[0]] = game.cards.players[move[0]][move[1]]
  }
  game.performAction(move, move[0])

  gameForPlay.game = game
}

function restartGame() {
  game.resetGame()
  additionalInformation.hadOneOrThirteen = []
  additionalInformation.tradedCards = [null, null, null, null]
  additionalInformation.narrTradedCards = [null, null, null, null]
  additionalInformation.previouslyUsedCards = []
  gameForPlay.game = game
}

async function startSimulation() {
  restartGame()
  while (!game.gameEnded) {
    console.log('move')

    const updateData = getPlayerUpdateFromGame(gameForPlay, miscState.gamePlayer)
    updateHandler(updateData).catch((e) => {
      console.error(e)
    })

    await simulateMove()
    await new Promise((r) => setTimeout(r, delayBetweenMoves))
  }
}

startSimulation()
</script>

<style scoped>
.game {
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  height: 100%;
}
</style>
