<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="instruction-text">
      Der Spielerwechsel hilft das Spiel fortzusetzen, wenn ein Spieler nicht mehr online ist. Ein Zuschauer kann sich als Auswechselspieler anbieten und alle anderen Spieler
      müssen dem Wechsel zustimmen.
    </div>

    <Button
      :disabled="!replacementPossible"
      label="Auswechsel anbieten"
      class="p-button-success"
      @click="startReplacement"
    />

    <h3>Aktueller Wechsel:</h3>
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
        label="Wechsel akzeptieren"
        @click="answerReplacement(true)"
      />
      <Button
        v-if="updateData.gamePlayer != -1"
        class="p-button-danger"
        label="Wechsel ablehnen"
        @click="answerReplacement(false)"
      />
      <Button
        v-if="updateData.replacement.replacementUsername === username"
        class="p-button-danger"
        label="Wechsel zurückziehen"
        @click="answerReplacement(false)"
      />
    </template>
    <div v-else>Aktuell gibt es keinen Wechsel</div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import CountdownTimer from '../CountdownTimer.vue'

import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'
import { GameSocketKey } from '@/services/injections'
import { computed, inject } from 'vue'
import { username } from '@/services/useUser'

const props = defineProps<{ updateData: UpdateDataType | null }>()
const gameSocket = inject(GameSocketKey)

async function startReplacement() {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'replacement:offer')
  console.log(res)
}

async function answerReplacement(accept: boolean) {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'replacement:answer', { accept })
  console.log(res)
}

const replacementPossible = computed(() => {
  return (
    props.updateData != null &&
    props.updateData.status === 'running' &&
    props.updateData.gamePlayer === -1 &&
    props.updateData.replacement == null &&
    Date.now() - props.updateData.lastPlayed > 60 * 1000
  )
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
