<template>
  <div v-if="!replacementPossible">
    <div>Spieleraustausch ist gerade nicht möglich</div>
    <div>Weil bla,bla</div>
  </div>
  <div v-if="replacementPossible">
    Starte Spieleraustausch
    <Button
      label="Start Wechsel"
      @click="startReplacement"
    />
  </div>
  <div v-if="existingReplacement">Letzter Spieleraustausch</div>
  <div>{{ updateData?.replacement ?? 'NO' }}</div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

import type { UpdateDataType } from '@/../../server/src/sharedTypes/typesDBgame'
import { GameSocketKey } from '@/services/injections'
import { computed, inject } from 'vue'

const props = defineProps<{ updateData: UpdateDataType | null }>()
const gameSocket = inject(GameSocketKey)

async function startReplacement() {
  if (gameSocket == null) {
    return
  }
  const res = await gameSocket.emitWithAck(2000, 'replacement:offer')
  console.log(res)
}

const existingReplacement = computed(() => {
  return props.updateData?.replacement != null
})
const replacementPossible = computed(() => {
  return (
    props.updateData != null &&
    props.updateData.status === 'running' &&
    (props.updateData.replacement == null || !props.updateData.replacement.running) &&
    Date.now() - props.updateData.lastPlayed > 60 * 1000
  )
})
</script>

<style scoped></style>
