<template>
  <Accordion
    :value="['signUp', 'signUpWaiting'].includes(tournament.status) ? 0 : undefined"
    style="margin: 20px"
  >
    <AccordionPanel :value="0">
      <AccordionHeader>{{ t('Tournament.deadlinesHeader') }}</AccordionHeader>
      <AccordionContent>
        <div>
          {{ `${t('Tournament.signupbegin')}: ${getLongTimeString(tournament.signupBegin)}` }}
        </div>
        <div>
          {{ `${t('Tournament.signUpDeadline')}: ${getLongTimeString(tournament.signupDeadline)}` }}
        </div>
        <div
          v-for="(v, i) in tournament.creationDates"
          :key="`Game-${Number(i) + 1}`"
        >
          {{
            `${t('Tournament.gameTime')}
              ${Number(i) + 1}: ${getLongTimeString(v)}`
          }}
        </div>
        <div>{{ `${t('Tournament.timePerGame')}: ${tournament.timePerGame}` }}</div>
      </AccordionContent>
    </AccordionPanel>
  </Accordion>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'

import type { PublicTournament } from '@/../../server/src/sharedTypes/typesTournament'

const { t } = useI18n()
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
