<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="instruction-text">
      {{ $t('Game.GameModal.Replacement.explanation') }}
    </div>

    <Button
      :disabled="!replacementPossible"
      :label="$t('Game.GameModal.Replacement.offerButton')"
      class="p-button-success"
      @click="startReplacement"
    />

    <h3>{{ $t('Game.GameModal.Replacement.currentHeading') }}</h3>
    <template v-if="updateData?.replacement != null">
      <div style="display: flex; align-items: center; margin-bottom: 10px">
        <PlayerWithPicture
          :username="updateData.replacement.replacementUsername"
          :clickable="false"
          :nameFirst="false"
        />
        <i
          class="pi pi-arrows-h"
          style="margin: 0 10px"
          aria-hidden="true"
        ></i>
        <PlayerWithPicture
          :username="updateData.players[updateData?.replacement.playerIndexToReplace].name"
          :clickable="false"
        />
      </div>
      <CountdownTimer
        mode="down"
        :initialMilliseconds="60 * 1000 + updateData.replacement.startDate - Date.now()"
        largestUnit="seconds"
        style="min-width: 150px"
      />
      <div style="margin: 15px 0">
        <div
          v-for="player in updateData.players.filter((_, i) => i != updateData?.replacement?.playerIndexToReplace)"
          :key="`replacement_player_${player.name}`"
          style="display: flex; align-items: center"
        >
          <i
            :class="updateData.replacement.acceptedByIndex?.includes(player.playerNumber) ? 'pi pi-check green' : 'pi pi-spin pi-spinner'"
            style="margin: 0 10px 0 0"
            aria-hidden="true"
          ></i>
          <PlayerWithPicture
            :username="player.name"
            :clickable="false"
            :nameFirst="false"
          />
        </div>
      </div>
      <Button
        v-if="updateData.gamePlayer != -1"
        :disabled="updateData.replacement.acceptedByIndex.includes(updateData.gamePlayer)"
        class="p-button-success"
        :label="$t('Game.GameModal.Replacement.acceptButton')"
        @click="answerReplacement(true)"
      />
      <Button
        v-if="updateData.gamePlayer != -1"
        class="p-button-danger"
        :label="$t('Game.GameModal.Replacement.rejectButton')"
        @click="answerReplacement(false)"
      />
      <Button
        v-if="updateData.replacement.replacementUsername === username"
        class="p-button-danger"
        :label="$t('Game.GameModal.Replacement.endOfferButton')"
        @click="answerReplacement(false)"
      />
    </template>
    <div v-else>{{ $t('Game.GameModal.Replacement.currentlyNone') }}</div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import CountdownTimer from '../CountdownTimer.vue'

import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'
import { GameSocketKey } from '@/services/injections'
import { inject, onBeforeUnmount, ref } from 'vue'
import { username } from '@/services/useUser'
import { useToast } from 'primevue/usetoast'
import { i18n } from '@/services/i18n'

const props = defineProps<{ updateData: UpdateDataType | null }>()
const gameSocket = inject(GameSocketKey)
const toast = useToast()

async function startReplacement() {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'replacement:offer')
  if (res.status !== 200) {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Toast.GenericError.summary'),
      detail: i18n.global.t('Toast.GenericError.detail'),
      life: 3000,
    })
  }
}

async function answerReplacement(accept: boolean) {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'replacement:answer', { accept })
  if (res.status !== 200) {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Toast.GenericError.summary'),
      detail: i18n.global.t('Toast.GenericError.detail'),
      life: 3000,
    })
  }
}

const replacementPossible = ref(false)
function updateReplacementPossible() {
  replacementPossible.value =
    props.updateData != null &&
    props.updateData.status === 'running' &&
    props.updateData.gamePlayer === -1 &&
    props.updateData.replacement == null &&
    Date.now() - 60 * 1000 > props.updateData.lastPlayed
}
updateReplacementPossible()

const interval = window.setInterval(() => {
  updateReplacementPossible()
}, 500)

onBeforeUnmount(() => {
  window.clearInterval(interval)
})
</script>

<style scoped>
.instruction-text {
  max-width: 600px;
  margin: 0 auto 15px auto;
  text-align: center;
}
.green {
  color: var(--green-600);
}
</style>
