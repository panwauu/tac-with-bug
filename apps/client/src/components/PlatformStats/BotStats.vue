<template>
  <p class="bot-stats-hinweis">
    {{ t('Stats.Bots.hinweis') }}
    <router-link :to="{ name: 'Bots' }">{{ t('Bots.alleBots') }}</router-link>
  </p>
  <div class="bot-stats-tabelle">
    <DataTable
      :value="zeilen"
      :loading="data == null"
      sort-field="games"
      :sort-order="-1"
      scrollable
      size="small"
    >
      <Column
        field="name"
        :header="t('Stats.Bots.bot')"
        sortable
      >
        <template #body="{ data: z }">
          <span class="bot-stats-name">{{ z.name }}</span>
          <span class="bot-stats-zusatz">{{ z.zusatz }}</span>
        </template>
      </Column>
      <Column
        field="games"
        :header="t('Stats.Bots.partien')"
        sortable
      />
      <Column
        field="gamesLast30Days"
        :header="t('Stats.Bots.letzte30')"
        sortable
      />
      <Column
        field="humans"
        :header="t('Stats.Bots.spieler')"
        sortable
      />
      <Column
        field="quote"
        :header="t('Stats.Bots.gegenMenschen')"
        sortable
      >
        <template #body="{ data: z }">
          <template v-if="z.againstHumans.games > 0">
            {{ Math.round(z.quote * 100) }} %
            <span class="bot-stats-zusatz">({{ z.againstHumans.wins }}/{{ z.againstHumans.games }})</span>
          </template>
          <template v-else>–</template>
        </template>
      </Column>
      <Column
        field="karten"
        :header="t('Stats.Bots.koop')"
        sortable
      >
        <template #body="{ data: z }">
          <template v-if="z.coop.games > 0">
            {{ Math.round(z.karten) }}
            <span class="bot-stats-zusatz">({{ t('Stats.Bots.partienKurz', { n: z.coop.games }) }})</span>
          </template>
          <template v-else>–</template>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
// Statistik je Bot (#251): wie oft gespielt, mit wie vielen Menschen, und Siege nur aus Partien,
// in denen alle Gegner Menschen sind (Partien von Bots gegen Bots verzerren sonst die Stärke).
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BotStatistic } from '@/../../server/src/sharedTypes/typesPlatformStatistic'
import { botInfo } from '@/views/kiStufen'

const props = defineProps<{ data: BotStatistic[] | null }>()
const { t } = useI18n()

const zeilen = computed(() =>
  (props.data ?? []).map((s) => {
    const info = s.botID != null ? botInfo(s.botID, t) : null
    return {
      ...s,
      name: info?.name ?? s.username ?? '',
      zusatz: info != null ? (info.schwierigkeit ?? '') : t('Stats.Bots.konto'),
      // Zum Sortieren: ohne Partien gegen Menschen ans Ende
      quote: s.againstHumans.games > 0 ? s.againstHumans.wins / s.againstHumans.games : -1,
      karten: s.coop.averageCards ?? Number.POSITIVE_INFINITY,
    }
  })
)
</script>

<style scoped>
.bot-stats-hinweis {
  margin-top: 0;
}
.bot-stats-tabelle {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}
.bot-stats-name {
  font-weight: bold;
  margin-right: 6px;
}
.bot-stats-zusatz {
  opacity: 0.7;
}
</style>
