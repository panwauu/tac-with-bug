<template>
  <div
    :class="`cardDeck ${miscState.players.length === 6 && positionStyles.turned === true
      ? 'cardDeckWidthTurned'
      : 'cardDeckWidth'
    }`"
    :style="
      positionStyles.stylePositionDeck?.[rotateIndex(miscState.deckInfo[0])]
    "
  >
    <img
      v-for="index in Math.max(0, miscState.deckInfo[1] - 1)"
      :key="`cardDeck-${index}`"
      alt="Kartenstapel"
      class="cardDeckCard cardDeckCardNotLast"
      src="@/assets/cards/backside.png"
    >
    <div style="display: flex; position: relative; align-items: flex-start">
      <img
        alt="Kartenstapel"
        :style="`opacity: ${miscState.deckInfo[1] === 0 ? '0.5' : '1'};`"
        class="cardDeckCard"
        src="@/assets/cards/backside.png"
      >
      <div class="cardDeckNumber">{{ miscState.deckInfo[1] }}</div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import type { positionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { miscStateType } from '@/services/compositionGame/useMisc'

const props = defineProps<{
    positionStyles: positionStylesState,
    miscState: miscStateType,
}>();

function rotateIndex(index: number) {
    return ((index + props.miscState.players.length - props.positionStyles.nRotate) % props.miscState.players.length);
}

</script>

<style scoped>
.cardDeck {
    position: absolute;
    display: flex;
    flex-direction: column;
    transition: all 2s ease-in-out;
}

.cardDeckWidth {
    width: 4%;
}

.cardDeckWidthTurned {
    width: 3%;
}

.cardDeckNumber {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: calc(3.5 / 100 * var(--board-size-in-px));
    color: lightgrey;
}

.cardDeckCard {
    width: 100%;
    border-radius: 9%/5.42%;
    object-fit: contain;
}

.cardDeckCardNotLast {
    margin-bottom: -155%;
}
</style>
