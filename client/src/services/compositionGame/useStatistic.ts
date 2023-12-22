import { reactive, computed, ComputedRef } from 'vue'
import type { UnwrapNestedRefs } from '@/../node_modules/@vue/reactivity/dist/reactivity'
import { i18n } from '@/services/i18n'

import type { GameStatistic, GameStatisticCardsType } from '@/../../server/src/sharedTypes/typesStatistic'
import type { UpdateDataType } from '../../../../server/src/sharedTypes/typesDBgame'

type StatisticStateTypeNonReactive = {
  statistic: GameStatistic[]
  cardsTable: ComputedRef<{ 0: number; 1: number; 2: number; 3: number; 4?: number; 5?: number; card: string }[]>
  cardStatistic: {
    labelKeys?: string[]
    labels?: string[]
    datasets?: any[]
  }
  actionStatistic: {
    labelKeys?: string[]
    labels?: string[]
    datasets?: any[]
  }
  setStatistic: (updateData: UpdateDataType, hexColors: string[]) => void
}

export type StatisticStateType = UnwrapNestedRefs<StatisticStateTypeNonReactive>

export function useStatistic(): StatisticStateType {
  const statisticState: StatisticStateType = reactive<StatisticStateTypeNonReactive>({
    statistic: [],
    cardStatistic: {},
    actionStatistic: {},
    cardsTable: computed(() => {
      const result: { 0: number; 1: number; 2: number; 3: number; 4?: number; 5?: number; card: string }[] = []
      ;(Object.keys(statisticState.statistic[0].cards) as Array<keyof GameStatisticCardsType>).forEach((key) => {
        if (key !== 'total') {
          result.push({
            card: key,
            0: statisticState.statistic[0].cards[key][0],
            1: statisticState.statistic[1].cards[key][0],
            2: statisticState.statistic[2].cards[key][0],
            3: statisticState.statistic[3].cards[key][0],
          })
          if (statisticState.statistic.length === 6) {
            result[result.length - 1]['4'] = statisticState.statistic[4].cards[key][0]
            result[result.length - 1]['5'] = statisticState.statistic[5].cards[key][0]
          }
        }
      })

      return result
    }),
    setStatistic: (updateData, hexColors) => {
      statisticState.statistic = updateData.statistic
      const playerIndices = Array.from(Array(updateData.statistic.length - updateData.substitutedPlayerIndices.length).keys()).concat(updateData.substitutedPlayerIndices)
      const teamIndices = updateData.coopCounter !== -1 ? Array(playerIndices.length).fill(0) : playerIndices.map((p) => updateData.teams.findIndex((t) => t.includes(p)))

      if (updateData.statistic.length !== 0) {
        const data = {
          labelKeys: ['1o13cardsLayed', 'actionCardsTotal', 'actionCardsPlayed'],
          labels: ['', '', ''],
          datasets: [] as any[],
        }
        for (let i = 0; i < updateData.statistic.length; i++) {
          data.datasets.push({
            label: updateData.playernames[i] ?? '',
            backgroundColor: hexColors[i],
            stack: teamIndices[i],
            data: [
              updateData.statistic[i].cards['1'][0] + updateData.statistic[i].cards['13'][0],
              countSpecialCards(updateData.statistic[i].cards)[0],
              countSpecialCards(updateData.statistic[i].cards)[1],
            ],
          })
        }

        for (let i = 0; i < data.labelKeys.length; i++) {
          if (window.innerWidth > 600) {
            data.labels[i] = i18n.global.t(`Game.Statistic.Cards.${data.labelKeys[i]}`)
          } else {
            data.labels[i] = i18n.global.t(`Game.Statistic.Cards.${data.labelKeys[i]}short`)
          }
        }

        statisticState.cardStatistic = data
      }

      if (updateData.statistic.length !== 0) {
        const data = {
          labelKeys: ['kickedBalls', 'numberSkipped', 'timePerPlay'],
          labels: ['', '', ''],
          datasets: [] as any[],
        }
        for (let i = 0; i < updateData.statistic.length; i++) {
          data.datasets.push({
            label: updateData.playernames[i] ?? '',
            backgroundColor: hexColors[i],
            stack: teamIndices[i],
            data: [
              updateData.statistic[i].actions.nBallsKickedEnemy + updateData.statistic[i].actions.nBallsKickedOwnTeam + updateData.statistic[i].actions.nBallsKickedSelf,
              updateData.statistic[i].actions.nAussetzen,
              updateData.statistic[i].actions.timePlayed / updateData.statistic[i].actions.nMoves,
            ],
          })
        }

        for (let i = 0; i < data.labelKeys.length; i++) {
          if (window.innerWidth > 600) {
            data.labels[i] = i18n.global.t(`Game.Statistic.Actions.${data.labelKeys[i]}`)
          } else {
            data.labels[i] = i18n.global.t(`Game.Statistic.Actions.${data.labelKeys[i]}short`)
          }
        }

        statisticState.actionStatistic = data
      }
    },
  })

  return statisticState
}

function countSpecialCards(cards: any): number[] {
  const arr = [0, 0, 0]
  Object.keys(cards).forEach((key) => {
    if (key !== 'total') {
      ;[0, 1, 2].forEach((i) => {
        arr[i] += cards[key][i]
      })
    }
  })
  return arr
}
