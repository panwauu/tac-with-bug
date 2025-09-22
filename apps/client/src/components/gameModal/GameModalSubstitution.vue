<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="instruction-text">
      {{ t('Game.GameModal.Substitution.explanation') }}
    </div>

    <PlayerWithPicture
      class="p-select substitutionPlayer dropdown-imitation"
      :username="newPlayer.username"
      :bot="newPlayer.bot"
      :name-first="false"
      :clickable="false"
    />
    <i
      class="pi pi-arrows-v"
      style="font-size: 2rem; padding: 10px"
    ></i>
    <PlayerWithPicture
      v-if="substitutionRunning"
      class="p-select substitutionPlayer dropdown-imitation"
      :username="updateData?.players[updateData?.substitution?.playerIndexToSubstitute ?? 0].name ?? ''"
      :bot="updateData?.players[updateData?.substitution?.playerIndexToSubstitute ?? 0].bot ?? true"
      :name-first="false"
      :clickable="false"
    />
    <Select
      v-if="!substitutionRunning"
      v-model="selectedToSubstitute"
      class="substitutionPlayer"
      :options="possibleToSubstitute"
      :placeholder="t('Game.GameModal.Substitution.placeholderSubstituted')"
      :empty-message="t('Game.GameModal.Substitution.noPlayerToSubstitute')"
      :disabled="substitutionRunning"
    >
      <template #value="slotProps">
        <PlayerWithPicture
          v-if="slotProps.value != null"
          :username="slotProps.value.username"
          :bot="slotProps.value.bot"
          :name-first="false"
          :clickable="false"
        />
        <div
          v-else
          style="height: 30px; display: flex; align-items: center"
        >
          {{ slotProps.placeholder }}
        </div>
      </template>
      <template #option="slotProps">
        <PlayerWithPicture
          :username="slotProps.option.username"
          :bot="slotProps.option.bot"
          :name-first="false"
          :clickable="false"
        />
      </template>
    </Select>

    <Button
      v-if="substitutionRunning === false"
      :disabled="startSubstitutionPossible === false"
      :label="t('Game.GameModal.Substitution.offerButton')"
      style="margin-top: 15px"
      severity="success"
      @click="startSubstitution"
    />

    <template v-if="substitutionRunning && updateData?.substitution != null">
      <CountdownTimer
        mode="down"
        :initial-milliseconds="60 * 1000 + updateData.substitution.startDate - Date.now()"
        largest-unit="seconds"
        style="min-width: 150px"
      />
      <div style="margin: 15px 0">
        <div
          v-for="player in updateData.players.filter((p, i) => i != updateData?.substitution?.playerIndexToSubstitute && p.bot === false)"
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
            :name-first="false"
          />
        </div>
      </div>
      <Button
        v-if="updateData.gamePlayer != -1 && updateData.gamePlayer != updateData.substitution.playerIndexToSubstitute"
        :disabled="updateData.substitution.acceptedByIndex.includes(updateData.gamePlayer)"
        severity="success"
        :label="t('Game.GameModal.Substitution.acceptButton')"
        @click="answerSubstitution(true)"
      />
      <Button
        v-if="updateData.gamePlayer != -1"
        severity="danger"
        :label="t('Game.GameModal.Substitution.rejectButton')"
        @click="answerSubstitution(false)"
      />
      <Button
        v-if="updateData.substitution.substitute.username === username"
        severity="danger"
        :label="t('Game.GameModal.Substitution.endOfferButton')"
        @click="answerSubstitution(false)"
      />
    </template>

    <template v-if="updateData != null && updateData.playernames.length > updateData.players.length">
      <h3>{{ t('Game.GameModal.SubstitutedPlayersHeader') }}</h3>
      <div
        v-for="(substitutedUsername, substitutionIndex) in updateData.playernames.filter((_, i) => i >= (updateData?.players.length ?? 0))"
        :key="`substitutedUser_${substitutedUsername}`"
        class="substitutedPlayerElement"
      >
        <PlayerWithPicture
          :username="substitutedUsername ?? ''"
          :name-first="false"
          style="margin-right: 15px"
        />
        <BallsImage :color="updateData.colors[updateData.substitutedPlayerIndices[substitutionIndex]]" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Select from 'primevue/select'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import CountdownTimer from '../CountdownTimer.vue'
import BallsImage from '../assets/BallsImage.vue'

import type { UpdateDataType } from 'tac-core/types/typesDBgame'
import { GameSocketKey } from '@/services/injections'
import { inject, ref, computed, watch } from 'vue'
import { username } from '@/services/useUser'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{ updateData: UpdateDataType | null }>()
const gameSocket = inject(GameSocketKey)
const toast = useToast()

async function startSubstitution() {
  if (gameSocket == null || startSubstitutionPossible.value === false || selectedToSubstitute.value == null) return

  const selfInGame = props.updateData?.players.findIndex((p) => p.name === username.value) !== -1
  const res = await gameSocket.emitWithAck(2000, 'substitution:start', selectedToSubstitute.value.playerIndex, selfInGame ? 3 : null)
  if (res.status !== 200) {
    toast.add({
      severity: 'error',
      summary: t('Toast.GenericError.summary'),
      detail: t('Toast.GenericError.detail'),
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
      summary: t('Toast.GenericError.summary'),
      detail: t('Toast.GenericError.detail'),
      life: 3000,
    })
  }
}

const substitutionRunning = computed(() => props.updateData?.substitution != null)

const inGeneralSubstitutionPossible = computed(
  () => props.updateData?.running && props.updateData.substitution == null && props.updateData.publicTournamentId == null && props.updateData.privateTournamentId == null
)
const playerCanBeSubstituted = computed(() => Date.now() - 60 * 1000 > (props.updateData?.lastPlayed ?? Infinity))
const botCanBeSubstituted = computed(() => !newPlayer.value.bot)
const startSubstitutionPossible = computed(
  () =>
    inGeneralSubstitutionPossible.value &&
    selectedToSubstitute.value != null &&
    ((playerCanBeSubstituted.value && !selectedToSubstitute.value.bot) || (botCanBeSubstituted.value && selectedToSubstitute.value.bot))
)

const newPlayer = computed(() => {
  if (props.updateData?.substitution != null) {
    return {
      username: props.updateData.substitution.substitute.username ?? props.updateData.substitution.substitute.botUsername,
      bot: props.updateData.substitution.substitute.botID != null,
    }
  }
  return props.updateData?.gamePlayer === -1 ? { username: username.value ?? '', bot: false } : { username: t('Waiting.bot'), bot: true }
})

const selectedToSubstitute = ref<{ playerIndex: number; username: string; bot: boolean } | null>(null)
const possibleToSubstitute = computed(() => {
  if (props.updateData == null) return []
  if (props.updateData.substitution != null) {
    return [
      {
        playerIndex: props.updateData.substitution.playerIndexToSubstitute,
        username: props.updateData.substitution.substitute.username ?? props.updateData.substitution.substitute.botUsername,
        bot: props.updateData.substitution.substitute.botID != null,
      },
    ]
  }

  return [
    ...props.updateData.players
      .map((p) => ({ playerIndex: p.playerNumber, username: p.name, bot: p.bot }))
      .filter((e) => e.bot && inGeneralSubstitutionPossible.value && botCanBeSubstituted.value),
    ...props.updateData.players
      .filter(
        (p) => inGeneralSubstitutionPossible.value && playerCanBeSubstituted.value && props.updateData?.players[0].narrFlag[0] && !p.narrFlag[1] && p.name !== username.value
      )
      .map((p) => ({ playerIndex: p.playerNumber, username: p.name, bot: p.bot })),
    ...props.updateData.players
      .filter(
        (p) =>
          inGeneralSubstitutionPossible.value &&
          playerCanBeSubstituted.value &&
          !props.updateData?.players[0].narrFlag[0] &&
          props.updateData?.players[0].tradeInformation != null &&
          p?.tradeInformation?.[1] === false &&
          p.name !== username.value
      )
      .map((p) => ({ playerIndex: p.playerNumber, username: p.name, bot: p.bot })),
    ...props.updateData.players
      .filter(
        (p) =>
          inGeneralSubstitutionPossible.value &&
          playerCanBeSubstituted.value &&
          !props.updateData?.players[0].narrFlag[0] &&
          props.updateData?.players[0].tradeInformation == null &&
          p.active &&
          p.name !== username.value
      )
      .map((p) => ({ playerIndex: p.playerNumber, username: p.name, bot: p.bot })),
  ]
})

watch(
  () => possibleToSubstitute.value,
  (value) => {
    if (!value.some((c) => c.username === selectedToSubstitute.value?.username)) {
      selectedToSubstitute.value = null
    }
  },
  { deep: true }
)
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

.dropdown-imitation {
  padding: 8px;
  height: 46px;
}

.substitutionPlayer {
  width: 300px;
}
</style>
