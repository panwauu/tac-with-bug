<template>
  <h2>{{ t('Landing.Waiting.title') }}</h2>
  <p>{{ t('Landing.Waiting.description') }}</p>
  <Accordion
    :multiple="false"
    v-model:value="activeIndex"
    :disabled="!isLoggedIn"
  >
    <AccordionPanel
      :value="0"
      :disabled="gamesSummary.runningGames.length === 0"
    >
      <AccordionHeader>{{ t('Landing.Waiting.openGames', { n: gamesSummary.runningGames.length }) }}</AccordionHeader>
      <AccordionContent>
        <p v-if="gamesSummary.runningGames.length === 0 && username != null">{{ t('Landing.Waiting.noGamesGoToWaiting') }}</p>
        <GamesTable
          v-else
          :loading="false"
          :n-entries="gamesSummary.runningGames.length"
          :games="gamesSummary.runningGames"
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
          v-if="gamesSummary.runningGames.length !== 0"
          severity="error"
          :closable="false"
        >
          {{ t('Landing.Waiting.openGamesWarning', { openGames: gamesSummary.runningGames.length }) }}
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
import { injectStrict, GamesSummaryKey } from '@/services/injections'
import { isLoggedIn, username } from '@/services/useUser'
import router from '@/router'

const { t } = useI18n()
const gamesSummary = injectStrict(GamesSummaryKey)

gamesSummary.getGames()

const activeIndex = ref(gamesSummary.runningGames.length !== 0 ? 0 : 1)
watch(
  () => gamesSummary.runningGames.length,
  () => {
    if (gamesSummary.runningGames.length !== 1) {
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
