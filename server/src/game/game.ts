import * as tCard from '../sharedTypes/typesCard'
import * as tBall from '../sharedTypes/typesBall'
import * as tStatistic from '../sharedTypes/typesStatistic'

import { cloneDeep } from 'lodash'
import logger from '../helpers/logger'
import { initalizeCards, dealCards, discardCard, narrCardSwap, addCardToDiscardPile, removeCardFromPlayersHand, checkCardsAndDeal } from './cardUtils'
import { createCardWithMove, initializeTeams } from './generateMovesUtils'
import { performBallAction, getLastNonTacCard } from './performMoveUtils'
import { initializeBalls, resetBalls, ballPlayer } from './ballUtils'
import { initalizeStatistic, statisticAnalyseAction } from './statistic'

export class game {
  nPlayers: number
  coop: boolean

  priorBalls: tBall.ballsType

  aussetzenFlag: boolean
  teufelFlag: boolean
  tradeFlag: boolean
  tradeCards: tCard.cardType[]
  tradeDirection: number
  narrFlag: boolean[]

  balls: tBall.ballsType
  cards: tCard.cardsType
  teams: number[][]

  cardsWithMoves: tCard.playerCard[]

  activePlayer: number
  sevenChosenPlayer: number | null
  gameEnded: boolean
  winningTeams: boolean[]

  statistic: tStatistic.gameStatistic[]

  constructor(nPlayers: number, nTeams: number, meisterVersion: boolean, coop: boolean, gameLoad?: game) {
    if (gameLoad != null) {
      this.nPlayers = gameLoad.nPlayers
      this.coop = gameLoad.coop || false
      this.priorBalls = gameLoad.priorBalls
      this.aussetzenFlag = gameLoad.aussetzenFlag
      this.teufelFlag = gameLoad.teufelFlag
      this.tradeFlag = gameLoad.tradeFlag
      this.tradeCards = gameLoad.tradeCards
      this.tradeDirection = gameLoad.tradeDirection
      this.narrFlag = gameLoad.narrFlag || (nPlayers === 4 ? [false, false, false, false] : [false, false, false, false, false, false])
      this.balls = gameLoad.balls
      this.cards = gameLoad.cards
      if (this.cards.discardPlayer == null) {
        this.cards.discardPlayer = (gameLoad.activePlayer + gameLoad.nPlayers - 1) % gameLoad.nPlayers
      }
      this.teams = gameLoad.teams
      this.cardsWithMoves = gameLoad.cardsWithMoves
      this.activePlayer = gameLoad.activePlayer
      this.gameEnded = gameLoad.gameEnded
      this.winningTeams = gameLoad.winningTeams
      this.statistic = gameLoad.statistic
      this.sevenChosenPlayer = gameLoad?.sevenChosenPlayer ?? null
    } else {
      if (nPlayers !== 4 && nPlayers !== 6) {
        throw new Error('Invalid Player Number -> only 4 or 6')
      }
      if (nPlayers === 4 && nTeams !== 2) {
        throw new Error('4 Players -> only 2 Teams')
      }
      if (nPlayers === 6 && nTeams !== 2 && nTeams !== 3) {
        throw new Error('6 Players -> only 2 or 3 Teams')
      }
      if (coop === true && nPlayers === 6 && nTeams !== 3) {
        throw new Error('Coop Version with 6 Players only with 3 Teams')
      }

      this.coop = coop

      this.tradeDirection = -1 + Math.floor(Math.random() * 1) * 2
      this.aussetzenFlag = false
      this.teufelFlag = false
      this.tradeFlag = true

      this.statistic = initalizeStatistic(nPlayers)
      this.nPlayers = nPlayers
      this.balls = initializeBalls(nPlayers)
      this.priorBalls = initializeBalls(nPlayers)
      this.cards = initalizeCards(nPlayers, meisterVersion)
      dealCards(this.cards)
      this.activePlayer = this.cards.dealingPlayer
      this.teams = initializeTeams(nPlayers, nTeams)
      this.gameEnded = false
      this.winningTeams = new Array(this.teams.length).fill(false)
      this.cardsWithMoves = []
      this.sevenChosenPlayer = null

      this.tradeCards = nPlayers === 4 ? ['', '', '', ''] : ['', '', '', '', '', '']
      this.narrFlag = nPlayers === 4 ? [false, false, false, false] : [false, false, false, false, false, false]
    }
  }

  checkWinningTeams(): boolean[] {
    const winningArray: boolean[] = new Array(this.teams.length).fill(false)

    for (let teamIndex = 0; teamIndex < winningArray.length; teamIndex++) {
      if (this.balls.filter((ball) => this.teams[teamIndex].includes(ball.player)).every((ball) => ball.state === 'locked')) {
        winningArray[teamIndex] = true
      }
    }

    return winningArray
  }

  resetGame(): void {
    // Reset States of balls
    resetBalls(this.balls)
    this.priorBalls = cloneDeep(this.balls)

    this.aussetzenFlag = false
    this.teufelFlag = false
    this.tradeFlag = true

    // Reset Cards and Moves
    this.cards = initalizeCards(this.nPlayers, this.cards.meisterVersion)
    dealCards(this.cards)
    this.activePlayer = this.cards.dealingPlayer
    this.cardsWithMoves = []
    this.tradeCards = this.nPlayers === 4 ? ['', '', '', ''] : ['', '', '', '', '', '']
  }

  getJSON(): string {
    return JSON.stringify(this)
  }

  updateCardsWithMoves(): void {
    let activePlayer = this.activePlayer

    if (this.cards.discardPile.length > 0 && this.teufelFlag === true) {
      activePlayer = (activePlayer + 1) % this.nPlayers
    }

    const cardsWithMoves: tCard.playerCard[] = []
    if (this.gameEnded) {
      this.cards.players[activePlayer].forEach((card) => {
        cardsWithMoves.push(createCardWithMove(card, this.balls, -1, activePlayer, this.teams, this.cards, this.coop, this.sevenChosenPlayer))
      })
      this.cardsWithMoves = cardsWithMoves
      return
    } else if (this.aussetzenFlag) {
      this.cards.players[activePlayer].forEach((card) => {
        if (card === 'tac') {
          cardsWithMoves.push(createCardWithMove('8', this.balls, activePlayer, activePlayer, this.teams, this.cards, this.coop, this.sevenChosenPlayer))
          cardsWithMoves[cardsWithMoves.length - 1].title = 'tac'
        } else {
          cardsWithMoves.push(createCardWithMove(card, this.balls, activePlayer, -1, this.teams, this.cards, this.coop, this.sevenChosenPlayer))
        }
        cardsWithMoves[cardsWithMoves.length - 1].possible = true
        cardsWithMoves[cardsWithMoves.length - 1].textAction = cardsWithMoves[cardsWithMoves.length - 1].textAction + '+abwerfen'
      })
    } else {
      this.cards.players[activePlayer].forEach((card) => {
        if (this.tradeFlag === true) {
          cardsWithMoves.push({ title: card, possible: true, ballActions: {}, textAction: 'tauschen' })
        } else if (card === 'tac') {
          const lastNonTacCard = getLastNonTacCard(this.cards)
          let tacCard: tCard.playerCard
          if (lastNonTacCard === undefined) {
            tacCard = createCardWithMove('1', this.balls, activePlayer, -1, this.teams, this.cards, this.coop, this.sevenChosenPlayer)
          } else {
            tacCard = createCardWithMove(lastNonTacCard, this.priorBalls, activePlayer, activePlayer, this.teams, this.cards, this.coop, this.sevenChosenPlayer)
          }
          tacCard.title = 'tac'
          cardsWithMoves.push(tacCard)
        } else if (card.substring(0, 4) === 'tac-') {
          const tacCard = createCardWithMove(
            '7' + card.substring(3, card.length),
            this.balls,
            activePlayer,
            activePlayer,
            this.teams,
            this.cards,
            this.coop,
            this.sevenChosenPlayer
          )
          tacCard.title = 'tac' + tacCard.title.substring(1, tacCard.title.length)
          cardsWithMoves.push(tacCard)
        } else {
          cardsWithMoves.push(createCardWithMove(card, this.balls, activePlayer, activePlayer, this.teams, this.cards, this.coop, this.sevenChosenPlayer))
        }
      })
    }

    if (this.cards.discardPile.length > 0 && this.teufelFlag === true) {
      activePlayer = (activePlayer + this.nPlayers - 1) % this.nPlayers
    }

    if (!cardsWithMoves.some((card) => card.possible)) {
      cardsWithMoves.forEach((card) => {
        card.possible = true
        card.textAction = 'abwerfen'
      })
    }

    // If 7 has started -> only possible to resume
    if (cardsWithMoves.some((card) => card.title.substring(0, 2) === '7-' || card.title.substring(0, 4) === 'tac-')) {
      cardsWithMoves
        .filter((card) => !(card.title.substring(0, 2) === '7-' || card.title.substring(0, 4) === 'tac-'))
        .forEach((card) => {
          card.possible = false
          card.ballActions = {}
          card.textAction = ''
        })
    } else if (this.winningTeams.some((entry) => entry === true)) {
      // If other team is winning am I have a Tac -> have to play Tac
      if (cardsWithMoves.some((card) => card.title === 'tac' && card.possible && card.textAction !== 'abwerfen')) {
        cardsWithMoves.forEach((card) => {
          if (card.title !== 'tac') {
            card.possible = false
            card.ballActions = {}
            card.textAction = ''
          }
        })
      } else {
        cardsWithMoves.forEach((card) => {
          card.possible = true
          card.ballActions = {}
          card.textAction = 'beenden'
        })
      }
    }

    this.cardsWithMoves = cloneDeep(cardsWithMoves)
  }

  checkMove(move: tBall.moveType): boolean {
    if (move === 'dealCards') {
      return this.cards.players.every((p) => p.length === 0)
    }

    if (this.tradeFlag) {
      return this.tradeCards[move[0]] === ''
    }

    if (this.narrFlag.some((e) => e)) {
      return !this.narrFlag[move[0]]
    }

    if (move[0] !== this.activePlayer) {
      logger.info('Player is not active Player')
      return false
    }

    const card = this.cardsWithMoves?.[move[1]]
    if (card == null) {
      logger.info('Card number is not in correct Range')
      return false
    }

    if (!card.possible) {
      logger.info('card not possible')
      return false
    }

    if (move.length === 3) {
      if (!card.textAction.includes(move[2])) {
        logger.info('textAction not allowed')
        return false
      }
    } else if (!card.ballActions[move[2]].includes(move[3])) {
      return false
    }

    return true
  }

  performAction(move: tBall.moveType | 'dealCards', deltaTime: number): void {
    if (move === 'dealCards') {
      this.checkCards()
      this.updateCardsWithMoves()
      return
    }

    const ballsSave = cloneDeep(this.balls)
    const cardsSave = cloneDeep(this.cards)
    const narrFlagSave = cloneDeep(this.narrFlag)
    const teufelFlagSave = cloneDeep(this.teufelFlag)
    this.performActionAfterStatistics(move)
    statisticAnalyseAction(move, ballsSave, this.balls, this.aussetzenFlag, this.teams, deltaTime, cardsSave, this.statistic, narrFlagSave, teufelFlagSave)
  }

  performActionAfterStatistics(move: tBall.moveTextOrBall): void {
    // Change move representation -> [PlayerNumber, CardNumber, (TextAction / BallNumber, newBallPosition)]
    if (move[2] === 'tauschen') {
      this.performTradeCards(move)
    } else if (this.narrFlag.some((e) => e === true) && move[2] === 'narr') {
      this.performNarrAction(move)
    } else {
      const card = this.cardsWithMoves[move[1]]

      if (move.length === 3) {
        this.performTextAction(card, move)
      } else {
        if (!card.title.includes('-')) {
          addCardToDiscardPile(this.cards, move[1], this.activePlayer, this.teufelFlag)
        }
        if (this.aussetzenFlag) {
          this.aussetzenFlag = false
        }
        performBallAction(card, move[2], move[3], move[1], this.balls, this.activePlayer, this.cards, this.priorBalls, this.teufelFlag)
        if ((card.title[0] === '7' && card.title.length > 1) || card.title.substring(0, 4) === 'tac-') {
          // do not discard or move on to next Player
          this.sevenChosenPlayer = ballPlayer(move[2])
        } else if (this.teufelFlag === true) {
          this.teufelFlag = false
          this.sevenChosenPlayer = null
          this.nextPlayer()
          removeCardFromPlayersHand(this.cards, move[1], this.activePlayer)
          this.nextPlayer()
        } else {
          this.sevenChosenPlayer = null
          removeCardFromPlayersHand(this.cards, move[1], this.activePlayer)
          this.nextPlayer()
        }
      }

      this.determineGameEnded()

      if (this.gameEnded) {
        this.narrFlag = this.nPlayers === 4 ? [false, false, false, false] : [false, false, false, false, false, false]
      }

      this.updateCardsWithMoves()

      this.determineGameEndedCoop()
    }
  }

  determineGameEnded() {
    if (this.coop === false) {
      // Won if before and after a move a team has all balls locked
      const winningArray = this.checkWinningTeams()
      if (
        winningArray.some((element, teamIndex) => {
          return element === true && this.winningTeams[teamIndex] === true
        })
      ) {
        this.gameEnded = true
      } else if (winningArray.some((element) => element === true) && this.cards.players[this.activePlayer].length === 0) {
        this.winningTeams = winningArray
        this.gameEnded = true
      } else {
        this.winningTeams = winningArray
      }
    }
  }

  determineGameEndedCoop() {
    if (
      this.coop === true &&
      this.balls.every((ball) => ball.state === 'locked') &&
      !this.cardsWithMoves.some((card) => card.title === 'tac' && card.possible && card.textAction !== 'abwerfen')
    ) {
      this.gameEnded = true
    }
  }

  performNarrAction(move: tBall.moveTextOrBall) {
    this.narrFlag[move[0]] = true
    if (this.narrFlag.every((e) => e === true)) {
      this.narrFlag = this.narrFlag.map(() => false)
      narrCardSwap(this.cards)
      this.updateCardsWithMoves()
    }
  }

  performTradeCards(move: tBall.moveTextOrBall) {
    this.tradeCards[move[0]] = this.cards.players[move[0]][move[1]]
    this.cards.players[move[0]].splice(move[1], 1)
    if (!this.tradeCards.some((card) => card === '')) {
      this.teams.forEach((team) => {
        for (let i = 0; i < team.length; i++) {
          this.cards.players[team[(i + this.tradeDirection + team.length) % team.length]].push(this.tradeCards[team[i]])
        }
      })
      this.tradeDirection = -1 * this.tradeDirection
      this.tradeFlag = false
      this.tradeCards = this.nPlayers === 4 ? ['', '', '', ''] : ['', '', '', '', '', '']
      this.updateCardsWithMoves()
    }
  }

  performTextAction(card: tCard.playerCard, move: tBall.moveText): void {
    const cardTextAction = move[2]

    if (cardTextAction === 'beenden') {
      return
    }

    discardCard(this.cards, move[1], this.activePlayer, this.teufelFlag)
    if (this.teufelFlag === true) {
      this.nextPlayer()
    }
    if (this.teufelFlag === true && cardTextAction === 'narr') {
      this.priorPlayer()
    }

    if (cardTextAction === 'aussetzen' && card.title === 'tac') {
      const auxBalls = cloneDeep(this.balls)
      this.balls = cloneDeep(this.priorBalls)
      this.priorBalls = cloneDeep(auxBalls)
    } else if (cardTextAction !== 'narr') {
      this.priorBalls = cloneDeep(this.balls)
    }

    this.cards.discardedFlag = cardTextAction === 'abwerfen'

    switch (cardTextAction) {
      case 'abwerfen':
        if (this.aussetzenFlag === true) {
          this.aussetzenFlag = false
        }
        break
      case 'narr':
        this.cards.players.forEach((cards, index) => {
          if (cards.length === 0) {
            this.narrFlag[index] = true
          }
        })
        this.performNarrAction(move)
        break
      case 'teufel':
        this.teufelFlag = true
        break
      case 'aussetzen':
        this.aussetzenFlag = true
        break
    }

    if (cardTextAction !== 'narr' && cardTextAction !== 'teufel') {
      this.nextPlayer()
    }
    if (cardTextAction !== 'teufel' && this.teufelFlag === true && cardTextAction !== 'narr') {
      this.teufelFlag = false
    }
  }

  nextPlayer() {
    this.activePlayer = (this.activePlayer + 1) % this.nPlayers
  }

  priorPlayer() {
    this.activePlayer = (this.activePlayer - 1 + this.nPlayers) % this.nPlayers
  }

  checkCards() {
    checkCardsAndDeal(this)
  }
}
