import { cloneDeep } from 'lodash'
import { shuffleArray, createCardDeck, initalizeCards, dealCards, discardCard, narrCardSwap } from '../game/cardUtils.js'

test('Init -> empty discard pile and empty hands', () => {
  const cards4 = initalizeCards(4, true)
  const cards6 = initalizeCards(6, true)
  expect(cards4.discardPile.length).toEqual(0)
  expect(cards6.discardPile.length).toEqual(0)
  for (const playerCards of cards4.players) {
    expect(playerCards.length).toEqual(0)
  }
  for (const playerCards of cards6.players) {
    expect(playerCards.length).toEqual(0)
  }
})

test('Narr Card Swap', () => {
  const cards4 = initalizeCards(4, true)
  dealCards(cards4)
  const cardsChecker = cloneDeep(cards4.players)

  narrCardSwap(cards4)
  expect(cards4.players[1]).toEqual(cardsChecker[2])
  expect(cards4.players[2]).toEqual(cardsChecker[3])
  expect(cards4.players[3]).toEqual(cardsChecker[0])
  expect(cards4.players[0]).toEqual(cardsChecker[1])
})

test('Test discard random card of random player', () => {
  const cards4 = initalizeCards(4, true)
  const cardIndex = Math.floor(Math.random() * 5)
  const player = Math.floor(Math.random() * 4)
  dealCards(cards4)
  const checkCard = cards4.players[player][cardIndex]
  const checkHandCards = cards4.players[player].slice(0, cardIndex).concat(cards4.players[player].slice(cardIndex + 1, 5))
  discardCard(cards4, cardIndex, player, false)
  expect(cards4.players[player].length).toEqual(4)
  expect(cards4.discardPile.length).toEqual(1)
  expect(cards4.discardPile[0]).toEqual(checkCard)
  expect(cards4.players[player]).toEqual(checkHandCards)
})

test('Discard of seven', () => {
  const cards4 = initalizeCards(4, true)
  const cardIndex = Math.floor(Math.random() * 5)
  const player = Math.floor(Math.random() * 4)
  dealCards(cards4)
  cards4.players[player][cardIndex] = '7-2'
  discardCard(cards4, cardIndex, player, false)
  expect(cards4.discardPile[cards4.discardPile.length - 1]).toEqual('7')
})

test('Deal Cards 4', () => {
  const cards = initalizeCards(4, true)
  const startPlayer = cards.dealingPlayer

  for (let j = 0; j < 4; j++) {
    dealCards(cards)
    for (const playerCards of cards.players) {
      expect(playerCards.length).toEqual(5)
    }
  }
  expect(cards.dealingPlayer).toEqual(startPlayer)
  dealCards(cards)
  for (const playerCards of cards.players) {
    expect(playerCards.length).toEqual(6)
  }
  expect(cards.dealingPlayer !== startPlayer).toEqual(true)
  expect(cards.deck.length).toEqual(104)
})

test('Deal Cards 4 - not meister', () => {
  const cards = initalizeCards(4, false)
  const startPlayer = cards.dealingPlayer

  for (let j = 0; j < 4; j++) {
    dealCards(cards)
    for (const playerCards of cards.players) {
      expect(playerCards.length).toEqual(5)
    }
  }
  expect(cards.dealingPlayer).toEqual(startPlayer)
  dealCards(cards)
  for (const playerCards of cards.players) {
    expect(playerCards.length).toEqual(5)
  }
  expect(cards.dealingPlayer !== startPlayer).toEqual(true)
  expect(cards.deck.length).toEqual(100)
})

test('Deal Cards 6', () => {
  const cards = initalizeCards(6, true)
  const startPlayer = cards.dealingPlayer

  for (let j = 0; j < 2; j++) {
    dealCards(cards)
    for (const playerCards of cards.players) {
      expect(playerCards.length).toEqual(6)
    }
  }
  dealCards(cards)
  for (let i = 0; i < cards.players.length; i++) {
    expect(cards.players[i].length).toEqual(5)
  }
  expect(cards.deck.length).toEqual(102)
  expect(cards.dealingPlayer !== startPlayer).toEqual(true)

  for (let j = 0; j < 3; j++) {
    dealCards(cards)
  }
  expect(cards.dealingPlayer).toEqual(startPlayer)
})

test('Deal Cards 6 - not Meisterversion', () => {
  const cards = initalizeCards(6, false)
  const startPlayer = cards.dealingPlayer

  for (let j = 0; j < 2; j++) {
    dealCards(cards)
    for (const playerCards of cards.players) {
      expect(playerCards.length).toEqual(5)
    }
  }
  dealCards(cards)
  for (const playerCards of cards.players) {
    expect(playerCards.length).toEqual(6)
  }
  expect(cards.deck.length).toEqual(96)
  expect(cards.dealingPlayer !== startPlayer).toEqual(true)

  for (let j = 0; j < 3; j++) {
    dealCards(cards)
  }
  expect(cards.dealingPlayer).toEqual(startPlayer)
})

test('Init -> dealing Player exists', () => {
  const cards4 = initalizeCards(4, true)
  expect(cards4.dealingPlayer < 4 && cards4.dealingPlayer >= 0).toEqual(true)
  expect(cards4.dealingPlayer < 6 && cards4.dealingPlayer >= 0).toEqual(true)
})

test('Size of Card Deck', () => {
  expect(createCardDeck(4, true).length).toEqual(104)
  expect(createCardDeck(6, true).length).toEqual(102)
  expect(createCardDeck(4, false).length).toEqual(100)
  expect(createCardDeck(6, false).length).toEqual(96)
})

test('Randomize Array -> Test of length and value consistency', () => {
  const randomArray = [...Array(8)].map(() => Math.floor(Math.random() * 10))
  const shuffledArray = [...randomArray]
  shuffleArray(shuffledArray)
  expect(shuffledArray.sort()).toEqual(randomArray.sort())
})

test('Randomize Array -> Random test', () => {
  const arraySum = [0, 0, 0]
  const array = [0, 1, -1]
  for (let i = 0; i < 1000; i++) {
    shuffleArray(array)
    for (let j = 0; j < array.length; j++) {
      arraySum[j] += array[j]
    }
  }
  for (const arraySumElement of arraySum) {
    expect(Math.abs(arraySumElement) < 100).toEqual(true)
  }
})

test('Test if random person is chosen', () => {
  let cards4 = initalizeCards(4, true)
  const playersToStart = [0, 0, 0, 0]
  const nIterations = 100
  for (let i = 0; i < nIterations; i++) {
    cards4 = initalizeCards(4, true)
    playersToStart[cards4.dealingPlayer] += 1
  }
  expect(playersToStart.every((entry) => entry > 0)).toBe(true)
})
