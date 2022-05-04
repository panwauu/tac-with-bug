<template>
  <div
    v-for="card in discardPileState.discardPile"
    :key="`discardPile-${card.index}`"
    class="discardPileContainer"
  >
    <CardImage
      :class="`card card${miscState.players.length}${miscState.players.length === 6 && positionStyles.turned
        ? '_turned'
        : ''
      }`"
      :style="card.style"
      :card="card.cardTitle"
      draggable="false"
    />
  </div>
</template>

<script setup lang='ts'>
import CardImage from '@/components/assets/CardImage.vue'

import type { discardPileStateType } from '@/services/compositionGame/useDiscardPile'
import type { positionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { miscStateType } from '@/services/compositionGame/useMisc'

defineProps<{
    positionStyles: positionStylesState,
    miscState: miscStateType,
    discardPileState: discardPileStateType,
}>();
</script>

<style scoped>
.discardPileContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: absolute;
}
.card {
    border-radius: 9%/5.42%;
    box-shadow: 0px 0px 10px -5px black;
    transition: all 0.8s ease-in-out;
    z-index: 210;
}

.card4 {
    height: 21%;
}

.card6 {
    height: 16.5%;
}

.card6_turned {
    height: 19%;
}
</style>