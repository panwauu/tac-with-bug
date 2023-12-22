import { cloneDeep } from 'lodash'
import type * as tCard from '../sharedTypes/typesCard.js'
import type { Game } from './game.js'

export function initalizeCards(nPlayers: number, meisterVersion: boolean): tCard.CardsType {
  const cards: tCard.CardsType = {
    dealingPlayer: Math.floor(Math.random() * nPlayers),
    discardPlayer: 0,
    discardedFlag: false,
    deck: createCardDeck(nPlayers, meisterVersion),
    discardPile: [],
    players: [],
    meisterVersion: meisterVersion,
  }

  for (let nPlayer = 0; nPlayer < nPlayers; nPlayer++) {
    cards.players.push([])
  }

  return cards
}

export function narrCardSwap(cards: tCard.CardsType): void {
  const firstPlayerCards = cards.players.shift()
  if (firstPlayerCards === undefined) {
    throw new Error('Card Swap Failed as cards.players is empty')
  }
  cards.players.push(firstPlayerCards)
}

export function discardCard(cards: tCard.CardsType, cardIndex: number, activePlayer: number, teufelFlag: boolean): void {
  const nPlayer = teufelFlag ? (activePlayer + 1) % cards.players.length : activePlayer
  addCardToDiscardPile(cards, cardIndex, activePlayer, teufelFlag)
  cards.players[nPlayer].splice(cardIndex, 1)
}

export function addCardToDiscardPile(cards: tCard.CardsType, cardIndex: number, activePlayer: number, teufelFlag: boolean) {
  const nPlayer = teufelFlag ? (activePlayer + 1) % cards.players.length : activePlayer
  cards.discardPlayer = nPlayer
  cards.discardPile.push(cards.players[nPlayer][cardIndex])
  if (cards.discardPile[cards.discardPile.length - 1].startsWith('7')) {
    cards.discardPile[cards.discardPile.length - 1] = '7'
  }
  if (cards.discardPile[cards.discardPile.length - 1].startsWith('tac')) {
    cards.discardPile[cards.discardPile.length - 1] = 'tac'
  }
}

export function removeCardFromPlayersHand(cards: tCard.CardsType, cardIndex: number, activePlayer: number) {
  cards.players[activePlayer].splice(cardIndex, 1)
}

export function dealCards(cards: tCard.CardsType): void {
  const nPlayers = cards.players.length

  let nCardsPerPlayer
  if (nPlayers === 4) {
    nCardsPerPlayer = 5

    if (cards.deck.length <= 24) {
      nCardsPerPlayer = cards.deck.length / nPlayers
    }
  } else if (nPlayers === 6 && cards.meisterVersion) {
    nCardsPerPlayer = 6

    if (cards.deck.length <= 30) {
      nCardsPerPlayer = 5
    }
  } else {
    nCardsPerPlayer = 5

    if (cards.deck.length <= 36) {
      nCardsPerPlayer = 6
    }
  }

  for (let p = 0; p < nPlayers; p++) {
    cards.players[p] = cards.deck.slice(0, nCardsPerPlayer)
    cards.deck.splice(0, nCardsPerPlayer)
  }

  if (cards.deck.length === 0) {
    cards.deck = createCardDeck(nPlayers, cards.meisterVersion)
  }

  cards.discardPile = []

  cards.dealingPlayer = (cards.dealingPlayer + 1) % nPlayers

  cards.discardedFlag = false
}

export function checkCardsAndDeal(game: Game) {
  if (game.cards.players.filter((playerCards) => playerCards.length > 0).length === 0) {
    game.narrFlag = game.nPlayers === 4 ? [false, false, false, false] : [false, false, false, false, false, false]
    game.tradeFlag = true
    game.teufelFlag = false
    game.aussetzenFlag = false
    game.priorBalls = cloneDeep(game.balls)
    dealCards(game.cards)
    game.activePlayer = game.cards.dealingPlayer
  }
}

export function createCardDeck(nPlayers: number, meisterVersion: boolean): Array<tCard.CardType> {
  const cardCount = {
    '1': 9,
    '2': 7,
    '3': 7,
    '4': 7,
    '5': 7,
    '6': 7,
    '7': 8,
    '8': 7,
    '9': 7,
    '10': 7,
    '12': 7,
    '13': 9,
    trickser: 7,
    tac: 4,
    krieger: 1,
    engel: 1,
    teufel: 1,
    narr: 1,
  }

  if (nPlayers === 6 && meisterVersion) {
    cardCount['12'] -= 2
  } else if (nPlayers === 6 && !meisterVersion) {
    cardCount['12'] -= 2
    cardCount['9'] -= 1
    cardCount['10'] -= 1
  }

  if (!meisterVersion) {
    cardCount['krieger'] = 0
    cardCount['narr'] = 0
    cardCount['teufel'] = 0
    cardCount['engel'] = 0
  }

  const deck = []

  for (const [key, value] of Object.entries(cardCount)) {
    for (let i = 0; i < value; i++) {
      deck.push(key)
    }
  }

  shuffleArray(deck)

  return deck
}

export function shuffleArray(array: Array<any>): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}
