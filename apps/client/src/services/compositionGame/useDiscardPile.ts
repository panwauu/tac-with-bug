import { reactive } from 'vue'
import { cardPictureDict } from './useCards'

import type { PlayerCard } from '@/@types/typesCard'
import type { PlayerCard as ServerPlayerCard } from '@repo/core/types'
import type { Player } from '@repo/core/types'
import type { PositionStylesState } from './usePositionStyles'

export interface DiscardElement {
  index: number
  cardTitle: string
  animationDone: boolean
  style: string
  key: string
}

export interface DiscardPileStateType {
  discardPile: DiscardElement[]
  updateDiscardPile: (discardPile: string[], players: Player[], cards: ServerPlayerCard[], positionStyles: PositionStylesState) => void
  addToDiscardPile: (card: PlayerCard) => void
  performAnimation: () => void
  getDiscardPile: () => DiscardElement[]
}

export function useDiscardPile(gamePlayer: number): DiscardPileStateType {
  const discardPileState: DiscardPileStateType = reactive({
    discardPile: [],
    updateDiscardPile: (discardPile, players, cards, positionStyles) => {
      if (discardPile.length < discardPileState.discardPile.length) {
        console.log('Reset Discard Pile')
        discardPileState.discardPile = []
      }

      for (let i = discardPileState.discardPile.length; i < discardPile.length; i++) {
        if (i < discardPile.length - 1) {
          discardPileState.discardPile.push({
            index: i,
            cardTitle: cardPictureDict[discardPile[i]],
            animationDone: true,
            style: 'transform: rotate(' + Math.floor(Math.random() * 360).toString() + 'deg);',
            key: Math.floor(Math.random() * 1e10).toString(),
          })
        } else if (!players[gamePlayer]?.active || (players[gamePlayer].active && !cards.some((card) => (card.title as string).includes('-')))) {
          const gameBoardElement = document.getElementById('gameboard')
          if (gameBoardElement === null) {
            break
          }
          const gameboardBounding = gameBoardElement.getBoundingClientRect()
          const style = positionStyles.positionStyles?.[4 * ((players.findIndex((player) => player.discarded) + players.length - positionStyles.nRotate) % players.length)]
          if (style === undefined) {
            break
          }

          const transformPx1 = (Number.parseFloat(style.left.slice(0, style.left.length - 1)) / 100) * gameboardBounding.height - gameboardBounding.height / 2
          const transformPx2 = (Number.parseFloat(style.top.slice(0, style.top.length - 1)) / 100) * gameboardBounding.height - gameboardBounding.height / 2
          discardPileState.discardPile.push({
            index: i,
            cardTitle: cardPictureDict[discardPile[i]],
            animationDone: false,
            style: `transform: translate(${transformPx1}px, ${transformPx2}px);`,
            key: Math.floor(Math.random() * 1e-10).toString(),
          })
          setTimeout(() => {
            discardPileState.discardPile.forEach((card) => {
              if (card.animationDone === false) {
                card.animationDone = true
                card.style = 'transform: rotate(' + Math.floor(Math.random() * 360).toString() + 'deg);'
              }
            })
          }, 300)
        }
      }
    },
    addToDiscardPile: (card) => {
      const cardElement = document.getElementById(card.key)
      const gameBoardElement = document.getElementById('gameboard')
      const cardBounding = cardElement?.getBoundingClientRect()
      const gameboardBounding = gameBoardElement?.getBoundingClientRect()

      if (gameboardBounding === undefined || cardElement === null || cardBounding === undefined) {
        return
      }

      const xOffset = cardBounding.left + cardBounding.width / 2 - (gameboardBounding.left + gameboardBounding.width / 2)
      const yOffset = cardBounding.top + cardBounding.height / 2 - (gameboardBounding.top + gameboardBounding.height / 2)

      discardPileState.discardPile.push({
        index: discardPileState.discardPile.length,
        cardTitle: cardPictureDict[card.title],
        animationDone: false,
        style: `height: ${cardBounding.height}px; transform: translate(${xOffset}px, ${yOffset}px);`,
        key: card.key,
      })

      cardElement.style.opacity = '0'
    },
    performAnimation: () => {
      discardPileState.discardPile.forEach((card) => {
        if (card.animationDone === false) {
          card.animationDone = true
          card.style = 'transform: rotate(' + Math.floor(Math.random() * 360).toString() + 'deg);'
        }
      })
    },
    getDiscardPile: () => {
      return discardPileState.discardPile.slice(Math.max(0, discardPileState.discardPile.length - 12), discardPileState.discardPile.length)
    },
  })

  return discardPileState
}
