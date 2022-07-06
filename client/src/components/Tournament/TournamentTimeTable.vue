<template>
  <Accordion
    :activeIndex="['signUp', 'signUpWaiting'].includes(tournament.status) ? 0 : undefined"
    style="margin: 20px"
  >
    <AccordionTab :header="$t('Tournament.deadlinesHeader')">
      <div>
        {{ `${$t('Tournament.signupbegin')}: ${getLongTimeString(tournament.signupBegin)}` }}
      </div>
      <div>
        {{ `${$t('Tournament.signUpDeadline')}: ${getLongTimeString(tournament.signupDeadline)}` }}
      </div>
      <div
        v-for="(v, i) in tournament.creationDates"
        :key="`Game-${Number(i) + 1}`"
      >
        {{
          `${$t('Tournament.gameTime')}
              ${Number(i) + 1}: ${getLongTimeString(v)}`
        }}
      </div>
      <div>{{ `${$t('Tournament.timePerGame')}: ${tournament.timePerGame}` }}</div>
    </AccordionTab>
  </Accordion>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'

import type { PublicTournament } from '@/../../server/src/sharedTypes/typesTournament'

defineProps<{ tournament: PublicTournament }>()

function getLongTimeString(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}
</script>
