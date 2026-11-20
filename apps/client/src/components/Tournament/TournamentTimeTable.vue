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
        <div v-if="fluidSize">
          {{ t('Tournament.fluidSize', { min: tournament.minTeams, max: tournament.nTeams }) }}
        </div>
        <div
          v-for="(v, i) in tournament.creationDates"
          :key="`Game-${Number(i) + 1}`"
        >
          {{
            `${t('Tournament.gameTime')}
              ${Number(i) + 1}: ${getLongTimeString(v)}`
          }}
          <small v-if="isConditionalRound(Number(i))">({{ t('Tournament.conditionalRound', { n: minTeamsForRoundKO(Number(i)) }) }})</small>
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
import { minTeamsForRoundKO } from '@/../../server/src/sharedDefinitions/tournamentKO'
import { computed } from 'vue'

const { t } = useI18n()
const props = defineProps<{ tournament: PublicTournament }>()

const signUpOpen = computed(() => ['signUp', 'signUpWaiting'].includes(props.tournament.status))
const fluidSize = computed(() => signUpOpen.value && props.tournament.minTeams < props.tournament.nTeams)

// While the sign up is open, the last rounds of a tournament with a fluid size only take place if enough teams sign up
function isConditionalRound(roundIndex: number) {
  return fluidSize.value && props.tournament.minTeams < minTeamsForRoundKO(roundIndex)
}

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
