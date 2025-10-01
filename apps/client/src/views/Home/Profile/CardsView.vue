<template>
  <div>
    <small>
      {{ t('Profile.CardsView.explanation') }}
      Diese Tabelle zeigt die Kartenverteilung die der Spieler über all seine Spiele erhalten hat, sowie die Warscheinlichkeiten der Karten im 4er Tac und die Differenz. Also
      wie viel öfter der Spieler eine bestimmte Karte bekommt. Unten kann das ganze für die gesamten Nicht-Sonderkarten gesehen werden. Schon nach wenigen Spielen gleicht sich
      die Kartenverteilung an die Warscheinlichkeiten an.
    </small>
    <DataTable :value="tableData">
      <Column
        field="card"
        :header="t('Game.Statistic.CardsTable.card')"
      >
        <template #body="slotProps">
          <div :class="`tac ${redText(slotProps.data.card) ? 'red' : ''}`">{{ cardName(slotProps.data.card) }}</div>
        </template>
      </Column>
      <Column
        field="shareUser"
        :header="username"
      >
        <template #body="slotProps">
          <div>{{ percentageFormatter.format(slotProps.data.shareUser) }}</div>
        </template>
      </Column>
      <Column
        field="probability"
        :header="t('Profile.CardsView.probability')"
      >
        <template #body="slotProps">
          <div>{{ percentageFormatter.format(slotProps.data.probability) }}</div>
        </template>
      </Column>
      <Column :header="t('Profile.CardsView.diff')">
        <template #body="slotProps">
          <div :class="{ 'diff-up': slotProps.data.shareUser - slotProps.data.probability > 0, 'diff-down': slotProps.data.shareUser - slotProps.data.probability < 0 }">
            {{ (slotProps.data.shareUser - slotProps.data.probability > 0 ? '+' : '') + percentageFormatter.format(slotProps.data.shareUser - slotProps.data.probability) }}
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useI18n } from 'vue-i18n'
import type { PlayerFrontendStatistic } from '@/generatedClient'
import { computed } from 'vue'
import { cardCount4erTac } from '@repo/core/game/cardUtils'

const { t } = useI18n()
const props = defineProps<{ username: string; playerStats: PlayerFrontendStatistic }>()

const percentageFormatter = Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function redText(title: string) {
  return !['narr', 'krieger', 'tac', 'engel', 'trickser', 'teufel'].includes(title)
}

function cardName(title: string) {
  if (['narr', 'krieger', 'tac', 'engel', 'trickser', 'teufel'].includes(title)) {
    return t(`Game.Statistic.CardsTable.${title}`)
  }
  return title
}

const tableData = computed(() => {
  const cardsTotal = props.playerStats.cards.total[0]
  const totalCardsIn4erDeck = Object.values(cardCount4erTac).reduce((acc, val) => acc + val, 0)

  const specialCardsTable = [
    ...Object.entries(props.playerStats.cards)
      .filter(([card]) => card !== 'total')
      .map(([card, values]) => ({
        card,
        shareUser: values[0] / cardsTotal,
        probability: ((cardCount4erTac as any)[card] ?? 0) / totalCardsIn4erDeck,
      })),
  ]

  specialCardsTable.push({
    card: t('Profile.CardsView.notSpecialCard'),
    shareUser: 1 - specialCardsTable.map((e) => e.shareUser).reduce((acc, val) => acc + val, 0),
    probability: 1 - specialCardsTable.map((e) => e.probability).reduce((acc, val) => acc + val, 0),
  })

  return specialCardsTable
})
</script>

<style scoped>
.tac {
  font-family: 'tacfontregular', Monospace;
}

.red {
  color: var(--tac-red);
}

.diff-up {
  color: var(--p-green-600);
}

.diff-down {
  color: var(--p-red-600);
}
</style>
