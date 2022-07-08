import { reactive } from 'vue'
import { cloneDeep } from 'lodash'

import * as tCard from '@/@types/typesCard'
import { PlayerCard as ServerPlayerCard } from '@/../../server/src/sharedTypes/typesCard'
import { BallsStateType } from './useBalls'
import { MiscStateType } from './useMisc'

export const cardPictureDict: { [key: string]: string } = {
  '1': 'eins',
  '2': 'zwei',
  '3': 'drei',
  '4': 'vier',
  '5': 'fuenf',
  '6': 'sechs',
  '7': 'sieben',
  '8': 'acht',
  '9': 'neun',
  '10': 'zehn',
  '12': 'zwoelf',
  '13': 'dreizehn',
  trickser: 'trickser',
  tac: 'tac',
  krieger: 'krieger',
  narr: 'narr',
  teufel: 'teufel',
  engel: 'engel',
}

let cardKeyNumber = 1

export interface CardsStateType {
  cards: tCard.PlayerCard[]
  ownCards: tCard.PlayerCard[] | null
  selectedCard: number
  cardAnimation: boolean
  resetSelectedCard: () => void
  setSelectedCard: (id: number) => void
  disableCards: () => void
  setAnimationEnded: () => void
  getTextAction: () => string[]
  getPossiblePositions: () => number[]
  getCardNames: (own: boolean) => tCard.PlayerCard[]
  updateCards: (cards: ServerPlayerCard[], ownCards: string[]) => void
  removeAllCards: () => void
}

export function useCards(ballsState: BallsStateType, miscState: MiscStateType): CardsStateType {
  const cardsState: CardsStateType = reactive({
    cards: [],
    ownCards: null,
    teufelCards: [],
    selectedCard: -1,
    cardAnimation: false,
    removeAllCards: () => {
      cardsState.resetSelectedCard()
      cardsState.cards = []
      cardsState.setAnimationEnded()
    },
    resetSelectedCard: () => {
      cardsState.selectedCard = -1
      ballsState.resetSelectedBall()
      ballsState.resetPlayableBalls()
    },
    setSelectedCard: (id) => {
      const nCard = cardsState.cards.findIndex((card) => card.key === id.toString())
      if (cardsState.selectedCard === nCard) {
        cardsState.selectedCard = -1
        ballsState.resetSelectedBall()
        ballsState.resetPlayableBalls()
      } else {
        cardsState.selectedCard = nCard
        ballsState.resetSelectedBall()
        ballsState.setPlayableBalls(cardsState.cards[nCard].ballActions)
      }
    },
    disableCards: () => {
      cardsState.cards.forEach((_, cardIndex) => {
        cardsState.cards[cardIndex].possible = false
        cardsState.cards[cardIndex].ballActions = {}
        cardsState.cards[cardIndex].textAction = ''
      })
    },
    setAnimationEnded: () => {
      cardsState.cardAnimation = false
      cardsState.cards.forEach((c, i) => {
        c.style = `left: ${i * 12}%;`
      })
    },
    getTextAction: () => {
      if (miscState.gamePlayer === -1) {
        return []
      }

      if (miscState.players.length > 0 && miscState.players[miscState.gamePlayer].narrFlag[0] === true && miscState.players[miscState.gamePlayer].narrFlag[1] === false) {
        return ['Karten weitergeben']
      }

      if (cardsState.cards.some((card) => card.textAction === 'beenden')) {
        return ['beenden']
      }

      if (cardsState.selectedCard === -1) {
        return []
      }
      const textAction = cardsState.cards[cardsState.selectedCard].textAction
      if (textAction === null || textAction === undefined || textAction === '') {
        return []
      }
      return textAction.split('+').filter((element) => element !== '')
    },
    getPossiblePositions: () => {
      if (cardsState.selectedCard === -1 || ballsState.selectedBall === -1) {
        return []
      }
      return cardsState.cards?.[cardsState.selectedCard]?.ballActions?.[ballsState.selectedBall] ?? []
    },
    getCardNames: (own: boolean) => {
      if (!own && (!miscState.teufelFlag || !miscState.players[miscState.gamePlayer].active)) {
        return []
      }

      let cardsCopy = cloneDeep(cardsState.cards)
      if (own && miscState.teufelFlag && miscState.players[miscState.gamePlayer].active) {
        cardsCopy = cloneDeep(cardsState.ownCards ?? [])
      }

      for (let i = 0; i < cardsCopy.length; i++) {
        if (cardsCopy[i].title[0] === '7') {
          cardsCopy[i].title = cardPictureDict['7']
        } else if (cardsCopy[i].title.substring(0, 3) === 'tac') {
          cardsCopy[i].title = cardPictureDict['tac']
        } else {
          cardsCopy[i].title = cardPictureDict[cardsCopy[i].title]
        }
      }
      return cardsCopy
    },
    updateCards: (cards, ownCards) => {
      // Handle ownCards
      if (miscState.teufelFlag && miscState.players[miscState.gamePlayer].active && cardsState.ownCards === null && !miscState.players[miscState.gamePlayer].narrFlag[0]) {
        //Not own Cards and teufelPlayer and not narrFlag
        if (cardsState.cards.length === 0) {
          cardsState.ownCards = []
          ownCards.forEach((cT, i) => {
            cardsState.ownCards?.push({
              title: cT,
              key: cardKeyNumber.toString(),
              possible: false,
              ballActions: {},
              textAction: '',
              style: `left: ${i * 12}%;`,
            })
            cardKeyNumber++
          })
        } else {
          cardsState.setAnimationEnded()
          cardsState.ownCards = cloneDeep(cardsState.cards)
        }
        cardsState.cards = []
      } else if (miscState.teufelFlag && miscState.players[miscState.gamePlayer].active && miscState.players[miscState.gamePlayer].narrFlag[0]) {
        cardsState.cards = []
        cardsState.ownCards = []
      } else if (!miscState.teufelFlag && cardsState.ownCards != null) {
        // Teufel ended -> ownCards to cards
        cardsState.cards = cloneDeep(cardsState.ownCards)
        cardsState.ownCards = null
      }

      // Handle cards
      if (
        miscState.teufelFlag &&
        miscState.players[(miscState.gamePlayer - 1 + miscState.nPlayers) % miscState.nPlayers].active &&
        !miscState.players[miscState.gamePlayer].narrFlag[0]
      ) {
        cardsState.cards = []
      } else if (miscState.players[miscState.gamePlayer]?.narrFlag[1]) {
        cardsState.cards = []
      } else {
        if (cardsState.cards.length > cards.length) {
          console.error('This should never happen unless Card was not discarded aka Tac after 7 or 7')
          cardsState.cards.splice(cards.length, cardsState.cards.length - cards.length)
        }
        for (let i = 0; i < cards.length; i++) {
          if (i + 1 > cardsState.cards.length) {
            cardsState.cards.push({ title: '', possible: false, ballActions: {}, textAction: '', key: '-1', style: '' })
          }

          if (cards[i].title !== cardsState.cards[i].title) {
            if (!miscState.teufelFlag || !miscState.players[miscState.gamePlayer].active) {
              cardsState.cards[i].key = cardKeyNumber.toString()
              cardKeyNumber++
            } else {
              cardsState.cards[i].key = (-i - 1).toString()
            }
          }
          cardsState.cards[i].title = cards[i].title
          cardsState.cards[i].possible = cards[i].possible
          cardsState.cards[i].ballActions = cards[i].ballActions
          cardsState.cards[i].textAction = cards[i].textAction
          if (!cardsState.cards[i].style || !cardsState.cardAnimation) {
            cardsState.cards[i].style = `left: ${(i + (cardsState.cardAnimation ? 1 : 0)) * 12}%;`
          }
        }
      }

      // Handle preselected Card - Either as 7 is not finished or if already selected or if only one possible
      const possibleCardIndex = cardsState.cards.findIndex((c) => c.possible)
      if (possibleCardIndex !== -1 && cardsState.cards.filter((c) => c.possible).length === 1 && cardsState.selectedCard === -1) {
        cardsState.selectedCard = possibleCardIndex
      }

      if (cardsState.selectedCard !== -1) {
        if (cardsState.selectedCard < cardsState.cards.length && cardsState.selectedCard >= 0) {
          ballsState.setPlayableBalls(cardsState.cards[cardsState.selectedCard].ballActions)
        } else {
          cardsState.selectedCard = -1
        }
      }
    },
  })

  return cardsState
}
