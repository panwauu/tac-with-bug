import { reactive, computed, ComputedRef } from 'vue';
import { UnwrapNestedRefs } from '@/../node_modules/@vue/reactivity/dist/reactivity';
import { i18n } from '@/services/i18n';

import * as tPlayers from '@/../../shared/types/typesPlayers'
import { gameStatistic, gameStatisticCardsType } from '@/../../shared/types/typesStatistic';

type statisticStateTypeNonReactive = {
    statistic: gameStatistic[],
    cardsTable: ComputedRef<{ 0: number, 1: number, 2: number, 3: number, 4?: number, 5?: number, card: string }[]>,
    cardStatistic: {
        labelKeys?: string[];
        labels?: string[];
        datasets?: any[];
    },
    actionStatistic: {
        labelKeys?: string[];
        labels?: string[];
        datasets?: any[];
    },
    setStatistic: (statistic: gameStatistic[], players: tPlayers.player[], coopCounter: number, hexColors: string[]) => void,
}

export type statisticStateType = UnwrapNestedRefs<statisticStateTypeNonReactive>

export function useStatistic(): statisticStateType {
    const statisticState: statisticStateType = reactive<statisticStateTypeNonReactive>({
        statistic: [],
        cardStatistic: {},
        actionStatistic: {},
        cardsTable: computed(() => {
            const result: { 0: number, 1: number, 2: number, 3: number, 4?: number, 5?: number, card: string }[] = [];
            (Object.keys(statisticState.statistic[0].cards) as Array<keyof gameStatisticCardsType>).forEach((key) => {
                if (key != 'total') {
                    result.push({
                        card: key,
                        0: statisticState.statistic[0].cards[key][0],
                        1: statisticState.statistic[1].cards[key][0],
                        2: statisticState.statistic[2].cards[key][0],
                        3: statisticState.statistic[3].cards[key][0]
                    })
                    if (statisticState.statistic.length === 6) {
                        result[result.length - 1]['4'] = statisticState.statistic[4].cards[key][0]
                        result[result.length - 1]['5'] = statisticState.statistic[5].cards[key][0]
                    }
                }
            })

            return result;
        }),
        setStatistic: (statistic, players, coopCounter, hexColors) => {
            statisticState.statistic = statistic

            if (statistic.length != 0) {
                const data = {
                    labelKeys: ['1o13cardsLayed', 'actionCardsTotal', 'actionCardsPlayed'],
                    labels: ['', '', ''],
                    datasets: [] as any[]
                }
                for (let i = 0; i < players.length; i++) {
                    data.datasets.push({
                        label: players[i].name,
                        backgroundColor: hexColors[i],
                        stack: coopCounter != -1 ? 0 : players[i].team,
                        data: [
                            statistic[i].cards['1'][0] + statistic[i].cards['13'][0],
                            countSpecialCards(statistic[i].cards)[0],
                            countSpecialCards(statistic[i].cards)[1],
                        ]
                    })
                }

                for (let i = 0; i < data.labelKeys.length; i++) {
                    if (window.innerWidth > 600) {
                        data.labels[i] = i18n.global.t(
                            `Game.Statistic.Cards.${data.labelKeys[i]}`
                        );
                    } else {
                        data.labels[i] = i18n.global.t(
                            `Game.Statistic.Cards.${data.labelKeys[i]}short`
                        );
                    }
                }

                statisticState.cardStatistic = data
            }

            if (statistic.length != 0) {
                const data = {
                    labelKeys: ['kickedBalls', 'numberSkipped', 'timePerPlay'],
                    labels: ['', '', ''],
                    datasets: [] as any[]
                }
                for (let i = 0; i < players.length; i++) {
                    data.datasets.push({
                        label: players[i].name,
                        backgroundColor: hexColors[i],
                        stack: coopCounter != -1 ? 0 : players[i].team,
                        data: [
                            statistic[i].actions.nBallsKickedEnemy + statistic[i].actions.nBallsKickedOwnTeam + statistic[i].actions.nBallsKickedSelf,
                            statistic[i].actions.nAussetzen,
                            statistic[i].actions.timePlayed / statistic[i].actions.nMoves,
                        ]
                    })
                }

                for (let i = 0; i < data.labelKeys.length; i++) {
                    if (window.innerWidth > 600) {
                        data.labels[i] = i18n.global.t(
                            `Game.Statistic.Actions.${data.labelKeys[i]}`
                        );
                    } else {
                        data.labels[i] = i18n.global.t(
                            `Game.Statistic.Actions.${data.labelKeys[i]}short`
                        );
                    }
                }

                statisticState.actionStatistic = data
            }
        }
    })

    return statisticState
}

function countSpecialCards(cards: any): number[] {
    const arr = [0, 0, 0]
    Object.keys(cards).forEach((key) => {
        if (key != 'total') {
            [0, 1, 2].forEach((i) => { arr[i] += cards[key][i] })
        }
    })
    return arr
}