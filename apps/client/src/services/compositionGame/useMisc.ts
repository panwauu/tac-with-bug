import { reactive } from 'vue'
import { useRoute } from 'vue-router'
import { i18n } from '@/services/i18n'

import type { Player, UpdateDataType } from '@repo/core/types'

export interface MiscStateType {
  gameID: number
  nPlayers: number
  gamePlayer: number
  tournamentID: number | null
  viewerMode: boolean
  deckInfo: [number, number]
  coopCounter: number
  gameRunning: boolean
  gameEndedText: string
  tradeDirection: 1 | 0 | -1
  players: Player[]
  aussetzenFlag: boolean
  teufelFlag: boolean
  onlineGamePlayers: number[]
  watchingData: {
    nWatchingPlayers: number
    watchingPlayerNames: string[]
  }
  created: number
  lastPlayed: number
  rematch_open: boolean
  setGamePlayer: (gamePlayer: number) => void
  setDeckInfo: (deckInfoInput: number[]) => void
  setCoopCounter: (coopCounter: number) => void
  setGameRunning: (gameEnded: boolean, running: boolean, players: Player[], winningTeams: boolean[], coopCounter: number, gamePlayer: number) => void
  setTradeDirection: (players: Player[], tradeDirection: 1 | -1) => void
  setPlayers: (players: Player[]) => void
  setFlags: (data: UpdateDataType) => void
  setOnlinePlayers: (data: { onlineGamePlayers: number[]; nWatchingPlayers: number; watchingPlayerNames: string[] }) => void
  setTimestamps: (created: number, lastPlayed: number) => void
}

export function useMisc(nPlayers?: number): MiscStateType {
  const route = useRoute()

  const miscState: MiscStateType = reactive({
    gameID: Number.parseInt(route.query.gameID as string),
    nPlayers: nPlayers ?? Number.parseInt(route.query.nPlayers as string),
    gamePlayer: -1,
    viewerMode: true,
    deckInfo: [0, 0],
    tournamentID: null,
    coopCounter: -1,
    gameRunning: true,
    gameEndedText: '',
    tradeDirection: 1,
    players: [],
    aussetzenFlag: false,
    teufelFlag: false,
    onlineGamePlayers: [],
    watchingData: {
      nWatchingPlayers: 0,
      watchingPlayerNames: [],
    },
    created: Date.now(),
    lastPlayed: Date.now(),
    rematch_open: false,
    setGamePlayer: (gamePlayer: number) => {
      miscState.gamePlayer = gamePlayer
      miscState.viewerMode = gamePlayer === -1
    },
    setOnlinePlayers: (data) => {
      miscState.onlineGamePlayers = data.onlineGamePlayers
      miscState.watchingData.nWatchingPlayers = data.nWatchingPlayers
      miscState.watchingData.watchingPlayerNames = data.watchingPlayerNames
    },
    setTimestamps: (created, lastPlayed) => {
      miscState.created = created
      miscState.lastPlayed = lastPlayed
    },
    setDeckInfo: (deckInfoInput) => {
      miscState.deckInfo = [
        deckInfoInput[0] ?? 0,
        deckInfoInput[1] > 95 || miscState.nPlayers === undefined ? 0 : Math.floor(deckInfoInput[1] / (5 * miscState.nPlayers)) || 0,
      ]
    },
    setCoopCounter: (coopCounter) => {
      miscState.coopCounter = coopCounter
    },
    setGameRunning: (gameEnded, running, players, winningTeams, coopCounter, gamePlayer) => {
      if (gameEnded === true || !running) {
        miscState.gameRunning = false
      } else {
        miscState.gameRunning = true
      }

      if (gameEnded === true && gamePlayer > 0) {
        if (coopCounter !== -1) {
          miscState.gameEndedText = i18n.global.t('Game.EndedOverlay.wonInX', { X: coopCounter })
        } else {
          const teamPlayers = players.filter((player) => player.team === players[gamePlayer].team && player.name !== players[gamePlayer].name).map((player) => player.name)
          miscState.gameEndedText = i18n.global.t(`Game.EndedOverlay.${winningTeams[players[gamePlayer].team] === true ? 'wonWith' : 'lostWith'}`, {
            players: teamPlayers.join(` ${i18n.global.t('Game.EndedOverlay.playersConnector')} `),
          })
        }
      } else if (!running && gamePlayer > 0) {
        miscState.gameEndedText = i18n.global.t('Game.EndedOverlay.aborted')
      } else if (gamePlayer === -1) {
        miscState.gameEndedText = `${winningTeams.map((win, teamIndex) =>
          win ? players.filter((p) => p.team === teamIndex).join(` ${i18n.global.t('Game.EndedOverlay.playersConnector')} `) : ''
        )} ${i18n.global.t('Game.EndedOverlay.endedForWatch')}`
      } else {
        miscState.gameEndedText = ''
      }
    },
    setTradeDirection: (players, tradeDirection) => {
      miscState.tradeDirection =
        miscState.nPlayers === 6 &&
        Math.max(...players.map((p) => p.team), 0) === 1 &&
        players.some((p) => {
          return 'tradeInformation' in p
        })
          ? tradeDirection
          : 0
    },
    setPlayers: (players) => {
      miscState.players = players
    },
    setFlags: (data) => {
      miscState.aussetzenFlag = data.aussetzenFlag
      miscState.teufelFlag = data.teufelFlag
      miscState.tournamentID = data.publicTournamentId
      miscState.rematch_open = data.rematch_open
    },
  })

  return miscState
}
