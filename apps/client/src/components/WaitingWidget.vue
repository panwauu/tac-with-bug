<template>
  <h2>{{ t('Landing.Waiting.title') }}</h2>
  <p>{{ t('Landing.Waiting.description') }}</p>
  <Accordion
    v-model:value="activeIndex"
    :multiple="false"
    :disabled="!isLoggedIn"
  >
    <AccordionPanel
      :value="0"
      :disabled="runningGamesOfUser.games.length === 0"
    >
      <AccordionHeader>{{ t('Landing.Waiting.openGames', { n: runningGamesOfUser.games.length }) }}</AccordionHeader>
      <AccordionContent>
        <p v-if="runningGamesOfUser.games.length === 0 && username != null">{{ t('Landing.Waiting.noGamesGoToWaiting') }}</p>
        <GamesTable
          v-else
          :loading="false"
          :n-entries="runningGamesOfUser.games.length"
          :games="runningGamesOfUser.games"
          :username="username ?? ''"
          :paginator="false"
          @row-select="startGame"
        />
      </AccordionContent>
    </AccordionPanel>
    <AccordionPanel :value="1">
      <AccordionHeader>{{ t('Landing.Waiting.waitingRoomsHeader') }}</AccordionHeader>
      <AccordionContent>
        <Message
          v-if="runningGamesOfUser.games.length !== 0"
          severity="error"
          icon="pi pi-times-circle"
          style="margin-top: 10px; margin-bottom: 10px"
        >
          {{ t('Landing.Waiting.openGamesWarning', { openGames: runningGamesOfUser.games.length }) }}
        </Message>
        <WaitingOverview />
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
import WaitingOverview from '@/components/WaitingOverview.vue'
import GamesTable from '@/components/GamesTable.vue'
import Message from 'primevue/message'

import { ref, watch } from 'vue'
import { injectStrict, RunningGamesOfUserKey } from '@/services/injections'
import { isLoggedIn, username } from '@/services/useUser'
import router from '@/router'

const { t } = useI18n()
const runningGamesOfUser = injectStrict(RunningGamesOfUserKey)

runningGamesOfUser.requestGames()

const activeIndex = ref(runningGamesOfUser.games.length !== 0 ? 0 : 1)
watch(
  () => runningGamesOfUser.games.length,
  () => {
    if (runningGamesOfUser.games.length !== 1) {
      activeIndex.value = 0
    }
  }
)

function startGame(game: any) {
  router.push({
    name: 'Game',
    query: {
      gameID: game.id,
      nPlayers: game.nPlayers,
    },
  })
}
</script>
