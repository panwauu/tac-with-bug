<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="instruction-text">
      {{ $t('Game.GameModal.Substitution.explanation') }}
    </div>

    <Button
      :disabled="playerIndexPossibleToSubstitute == null"
      :label="$t('Game.GameModal.Substitution.offerButton')"
      class="p-button-success"
      @click="startSubstitution"
    />

    <h3>{{ $t('Game.GameModal.Substitution.currentHeading') }}</h3>
    <template v-if="updateData?.substitution != null">
      <div style="display: flex; align-items: center; margin-bottom: 10px">
        <PlayerWithPicture
          :username="updateData.substitution.substitute.substitutionUsername ?? ''"
          :clickable="false"
          :nameFirst="false"
        />
        <i
          class="pi pi-arrows-h"
          style="margin: 0 10px"
          aria-hidden="true"
        ></i>
        <PlayerWithPicture
          :username="updateData.players[updateData?.substitution.playerIndexToSubstitute].name"
          :clickable="false"
        />
      </div>
      <CountdownTimer
        mode="down"
        :initialMilliseconds="60 * 1000 + updateData.substitution.startDate - Date.now()"
        largestUnit="seconds"
        style="min-width: 150px"
      />
      <div style="margin: 15px 0">
        <div
          v-for="player in updateData.players.filter((_, i) => i != updateData?.substitution?.playerIndexToSubstitute)"
          :key="`substitution_player_${player.name}`"
          style="display: flex; align-items: center"
        >
          <i
            :class="updateData.substitution.acceptedByIndex?.includes(player.playerNumber) ? 'pi pi-check green' : 'pi pi-spin pi-spinner'"
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
        v-if="updateData.gamePlayer != -1 && updateData.gamePlayer != updateData.substitution.playerIndexToSubstitute"
        :disabled="updateData.substitution.acceptedByIndex.includes(updateData.gamePlayer)"
        class="p-button-success"
        :label="$t('Game.GameModal.Substitution.acceptButton')"
        @click="answerSubstitution(true)"
      />
      <Button
        v-if="updateData.gamePlayer != -1"
        class="p-button-danger"
        :label="$t('Game.GameModal.Substitution.rejectButton')"
        @click="answerSubstitution(false)"
      />
      <Button
        v-if="updateData.substitution.substitute.substitutionUsername === username"
        class="p-button-danger"
        :label="$t('Game.GameModal.Substitution.endOfferButton')"
        @click="answerSubstitution(false)"
      />
    </template>
    <div v-else>{{ $t('Game.GameModal.Substitution.currentlyNone') }}</div>

    <template v-if="updateData != null && updateData.playernames.length > updateData.players.length">
      <h3>{{ $t('Game.GameModal.SubstitutedPlayersHeader') }}</h3>
      <div
        v-for="(substitutedUsername, substitutionIndex) in updateData.playernames.filter((_, i) => i >= (updateData?.players.length ?? 0))"
        :key="`substitutedUser_${substitutedUsername}`"
        class="substitutedPlayerElement"
      >
        <PlayerWithPicture
          :username="substitutedUsername ?? ''"
          :nameFirst="false"
          style="margin-right: 15px"
        />
        <BallsImage :color="updateData.colors[updateData.substitutedPlayerIndices[substitutionIndex]]" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import CountdownTimer from '../CountdownTimer.vue'
import BallsImage from '../assets/BallsImage.vue'

import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'
import { GameSocketKey } from '@/services/injections'
import { inject, onBeforeUnmount, ref } from 'vue'
import { username } from '@/services/useUser'
import { useToast } from 'primevue/usetoast'
import { i18n } from '@/services/i18n'

const props = defineProps<{ updateData: UpdateDataType | null }>()
const gameSocket = inject(GameSocketKey)
const toast = useToast()

async function startSubstitution() {
  if (gameSocket == null || playerIndexPossibleToSubstitute.value == null) return

  const res = await gameSocket.emitWithAck(2000, 'substitution:start', playerIndexPossibleToSubstitute.value, null)
  if (res.status !== 200) {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Toast.GenericError.summary'),
      detail: i18n.global.t('Toast.GenericError.detail'),
      life: 3000,
    })
  }
}

async function answerSubstitution(accept: boolean) {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'substitution:answer', { accept })
  if (res.status !== 200) {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Toast.GenericError.summary'),
      detail: i18n.global.t('Toast.GenericError.detail'),
      life: 3000,
    })
  }
}

const playerIndexPossibleToSubstitute = ref<number | undefined>(undefined)

function updateSubstitutionPossible() {
  if (
    props.updateData == null ||
    !props.updateData.running ||
    props.updateData.gamePlayer !== -1 ||
    username.value == null ||
    props.updateData.substitution != null ||
    props.updateData.publicTournamentId != null ||
    props.updateData.privateTournamentId != null ||
    Date.now() - 60 * 1000 <= props.updateData.lastPlayed
  ) {
    playerIndexPossibleToSubstitute.value = undefined
    return
  }

  if (props.updateData.players[0].narrFlag[0]) {
    // narr
    const potentialPlayernumbers = props.updateData.players.filter((p) => !p.narrFlag[1]).map((p) => p.playerNumber)
    playerIndexPossibleToSubstitute.value = potentialPlayernumbers.length === 1 ? potentialPlayernumbers[0] : undefined
  } else if (props.updateData.players[0].tradeInformation != null) {
    // trade
    const potentialPlayernumbers = props.updateData.players.filter((p) => p?.tradeInformation?.[1] === false).map((p) => p.playerNumber)
    playerIndexPossibleToSubstitute.value = potentialPlayernumbers.length === 1 ? potentialPlayernumbers[0] : undefined
  } else {
    // ordinary move
    const activePlayer = props.updateData.players.findIndex((p) => p.active)
    playerIndexPossibleToSubstitute.value = activePlayer === -1 ? undefined : activePlayer
  }
}
updateSubstitutionPossible()

const interval = window.setInterval(() => {
  updateSubstitutionPossible()
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

.substitutedPlayerElement {
  display: flex;
  margin-bottom: 5px;
}
</style>
