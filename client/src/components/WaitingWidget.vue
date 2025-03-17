<template>
  <h2>{{ t('Landing.Waiting.title') }}</h2>
  <p>{{ t('Landing.Waiting.description') }}</p>
  <Accordion
    :multiple="false"
    :active-index="activeIndex"
    :disabled="!isLoggedIn"
  >
    <AccordionTab
      :header="t('Landing.Waiting.openGames', { n: gamesSummary.runningGames.length })"
      :disabled="gamesSummary.runningGames.length === 0"
    >
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
    </AccordionTab>
    <AccordionTab :header="t('Landing.Waiting.waitingRoomsHeader')">
      <Message
        v-if="gamesSummary.runningGames.length !== 0"
        severity="error"
        :closable="false"
      >
        {{ t('Landing.Waiting.openGamesWarning', { openGames: gamesSummary.runningGames.length }) }}
      </Message>
      <WaitingOverview />
    </AccordionTab>
  </Accordion>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import WaitingOverview from '@/components/WaitingOverview.vue'
import GamesTable from '@/components/GamesTable.vue'
import Message from 'primevue/message'

import { ref, watch } from 'vue'
import { injectStrict, GamesSummaryKey } from '@/services/injections'
import { isLoggedIn, username } from '@/services/useUser'
import router from '@/router'

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
