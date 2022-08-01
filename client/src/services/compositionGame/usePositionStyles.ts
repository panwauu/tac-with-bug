import { reactive, watch, onBeforeUnmount } from 'vue'

import { positionStyles6, buildStyles, PositionStyle } from '@/js/buildCells'
import { getCircleStart, getCircleHouse, getPlayerCards, getPlayerPicture, getPlayerName, getCoopCardCounter, getDeckPositions } from '@/js/getAnnotationStyles'
import { getNRotation } from '@/js/rotateBoard'
import { MiscStateType } from './useMisc'
import { useSettingsStore } from '../../store/settings'

export interface PositionStylesState {
  initialized: boolean
  turned?: boolean
  ballsColors?: string[]
  nRotate: number
  positionStyles?: PositionStyle[]
  stylePositionStart?: string[]
  stylePositionHouse?: string[]
  stylePositionCards?: string[]
  stylePositionBalls?: PositionStyle[]
  stylePositionPictures?: string[]
  stylePositionNames?: string[]
  stylePositionCoop?: string
  stylePositionDeck?: string[]
  getHexColors: () => string[]
  setBallsColors: (ballsColors: string[]) => void
  recalculatePositionStyles: () => void
  onResize: () => void
}

export const colorTranslator: { [key: string]: string } = {
  red: '#FF000080',
  blue: '#0000FF80',
  green: '#47d147A0',
  black: '#00000080',
  orange: '#ffa50080',
  blackWhite: '#a0a0a0A0',
  melone: '#157215A0',
  white: '#f0f0f0A0',
  turquoise: '#40E0D080',
  pink: '#ff3ab791',
  yellow: '#FFFF0080',
}

export function usePositionStyles(miscState: MiscStateType): PositionStylesState {
  const onResize = () => {
    const gameViewBox = document.getElementById('gameView')?.getBoundingClientRect()
    const width = gameViewBox?.width ?? window.innerWidth
    const height = gameViewBox?.height ?? window.innerHeight

    if ((height + 80 < width && width / height < 1.4) || width / height < 0.66) {
      positionStyles.turned = false
    } else {
      positionStyles.turned = true
    }
    positionStyles.recalculatePositionStyles()
  }

  const settingsStore = useSettingsStore()

  const positionStyles: PositionStylesState = reactive({
    initialized: false,
    turned: undefined,
    nRotate: 0,
    positionStyles: undefined,
    stylePositionStart: undefined,
    stylePositionHouse: undefined,
    stylePositionCards: undefined,
    stylePositionBalls: undefined,
    stylePositionPictures: undefined,
    stylePositionNames: undefined,
    stylePositionCoop: undefined,
    stylePositionDeck: undefined,
    ballsColors: undefined,
    getHexColors: () => {
      return (positionStyles.ballsColors as string[]).map((c) => colorTranslator[c])
    },
    setBallsColors: (ballsColors: string[]) => {
      positionStyles.ballsColors = ballsColors
      positionStyles.recalculatePositionStyles()
    },
    recalculatePositionStyles: () => {
      if (positionStyles.turned != null && positionStyles.ballsColors != null) {
        const hexColors = positionStyles.ballsColors.map((c) => colorTranslator[c])
        const turned = positionStyles.turned

        positionStyles.initialized = true
        positionStyles.nRotate = miscState.viewerMode ? 0 : getNRotation(settingsStore.defaultPositions, miscState.gamePlayer, miscState.nPlayers)
        positionStyles.positionStyles = miscState.nPlayers === 6 ? positionStyles6(turned) : buildStyles(45.3)
        positionStyles.stylePositionStart = getCircleStart(miscState.nPlayers, hexColors, positionStyles.nRotate)
        positionStyles.stylePositionHouse = getCircleHouse(miscState.nPlayers, hexColors, turned, positionStyles.nRotate)
        positionStyles.stylePositionCards = getPlayerCards(miscState.nPlayers, turned)
        positionStyles.stylePositionBalls = miscState.nPlayers === 6 ? positionStyles6(turned) : buildStyles(45.3)
        positionStyles.stylePositionPictures = getPlayerPicture(miscState.nPlayers, turned)
        positionStyles.stylePositionNames = getPlayerName(miscState.nPlayers, turned)
        positionStyles.stylePositionCoop = getCoopCardCounter(miscState.nPlayers, turned)
        positionStyles.stylePositionDeck = getDeckPositions(miscState.nPlayers, turned)
      }
    },
    onResize: onResize,
  })

  watch(
    () => [...settingsStore.defaultPositions],
    () => {
      positionStyles.recalculatePositionStyles()
    }
  )

  onResize()
  window.addEventListener('resize', onResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
  })

  return positionStyles
}
