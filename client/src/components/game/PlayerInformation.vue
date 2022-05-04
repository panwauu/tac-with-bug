<template>
  <div v-for="(player, index) in miscState.players" :key="`playerNameCards-${String(index)}`">
    <h2
      :class="`posAbsolute playerName `"
      :style="positionStyles.stylePositionNames?.[rotateIndex(Number(index))]"
    >{{ player.name }}</h2>
    <div
      :class="`posAbsolute playerCards${player.narrFlag[0] === true && player.narrFlag[1] === false
        ? ' narrAnimation' +
          rotateIndex(Number(index)).toString() +
          (miscState.players.length === 6
            ? positionStyles.turned
              ? '-6_turned'
              : '-6'
            : '')
        : ''
      }`"
      :style="positionStyles.stylePositionCards?.[rotateIndex(Number(index))]"
    >
      <template v-if="hasOneOrThirteen(Number(index)) === true">
        <div class="playerCardsRaus playerCardsRausTL">13</div>
        <div class="playerCardsRaus playerCardsRausTR">13</div>
        <div class="playerCardsRaus playerCardsRausBL">1</div>
        <div class="playerCardsRaus playerCardsRausBR">1</div>
      </template>
      <transition-group name="list">
        <CardImage
          v-for="c in player.remainingCards"
          :key="`Player-${String(index)}-RemCard-${c}`"
          :card="c === 1 && hasOneOrThirteen(Number(index)) ? 'kannraus' : 'card'"
          draggable="false"
          :class="{
            posAbsolute: c > 1,
            remainingCards: true,
            remainingCardsActiveLeft:
              c === player.remainingCards &&
              player.active === true &&
              !(player.narrFlag[0] == true && player.narrFlag[1] === false),
            remainingCardsActiveRight:
              positionStyles.stylePositionCards?.[rotateIndex(Number(index))].includes(
                'right'
              ) &&
              c === player.remainingCards &&
              player.active === true &&
              !(player.narrFlag[0] == true && player.narrFlag[1] === false),
          }"
          :style="
            c > 1
              ? `${positionStyles.stylePositionCards?.[
                rotateIndex(Number(index))
              ].includes('right')
                ? 'right'
                : 'left'
              }: ${(c - 1) * 42}%;`
              : ''
          "
        />
      </transition-group>
      <Aussetzen
        v-if="player.active && miscState.aussetzenFlag"
        :style="`left: ${50 +
          15 *
          player.remainingCards *
          (positionStyles.stylePositionCards?.[rotateIndex(Number(index))].includes(
            'right'
          )
            ? -1
            : 1)
        }%`"
        class="aussetzenSign"
      />
    </div>
    <ProfilePicture
      :username="String(player.name)"
      :class="`posAbsolute playerPicture ${miscState.players.length === 6
        ? `playerPicture6${positionStyles.turned ? 'turned' : ''}`
        : ''
      } ${index === miscState.gamePlayer && !miscState.viewerMode && $route.name === 'Game'
        ? 'clickable'
        : ''
      }`"
      :style="positionStyles.stylePositionPictures?.[rotateIndex(Number(index))]"
      :online="Boolean(miscState.onlineGamePlayers.includes(index))"
      @click="toggle($event, Number(index))"
    />
  </div>

  <OverlayPanel ref="opRef" style="max-width: 300px">
    <EmojiSelector :miscState="miscState" @close="opRef?.hide()" />
  </OverlayPanel>
</template>

<script setup lang='ts'>
import ProfilePicture from '@/components/ProfilePicture.vue'
import Aussetzen from '@/components/icons/AussetzenSymbol.vue'
import CardImage from '@/components/assets/CardImage.vue'
import OverlayPanel from 'primevue/overlaypanel'
import EmojiSelector from './EmojiSelector.vue'

import type { positionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { miscStateType } from '@/services/compositionGame/useMisc'
import { ref } from 'vue'
import router from '@/router'

const opRef = ref<undefined | OverlayPanel>()

const props = defineProps<{
  positionStyles: positionStylesState,
  miscState: miscStateType,
}>();

function hasOneOrThirteen(index: number): boolean {
  if ('tradeInformation' in props.miscState.players[index] && props.miscState.players[index].tradeInformation?.[0] === true) {
    return true;
  }
  return false;
}

function rotateIndex(index: number) {
  return ((index + props.miscState.players.length - props.positionStyles.nRotate) % props.miscState.players.length);
}

function toggle(event: Event, index: number) {
  if (index === props.miscState.gamePlayer && !props.miscState.viewerMode && router.currentRoute.value.name === 'Game') {
    opRef.value?.toggle(event);
  }
}

</script>

<style scoped>
.posAbsolute {
  position: absolute;
}
.playerName {
  margin: 0;
  font-size: calc(3.5 / 100 * var(--board-size-in-px));
  height: 4%;
  z-index: 10;
}

.playerCards {
  height: 6%;
  width: 3.6%;
  z-index: 10;
}

.aussetzenSign {
  width: calc(var(--board-size-in-px) * 0.08);
  height: calc(var(--board-size-in-px) * 0.08);
  transform: translate(-50%, -50%);
  top: 50%;
  position: absolute;
  opacity: 0.7;
  z-index: 20;
}

.playerPicture {
  box-sizing: border-box;
  display: block;
  width: 6%;
  height: 6%;
  margin: 0;
  padding: 0;
  z-index: 10;
  border-radius: 20%;
}

.playerPicture6 {
  width: 6.93%;
}

.playerPicture6turned {
  width: 5.19%;
}

.remainingCards {
  top: 0;
  height: 100%;
  object-fit: contain;
  border-radius: 9%/5.42%;
}

.remainingCardsActiveLeft {
  transform-origin: 100% 100%;
  transform: translate(-15%, 0) rotate(20deg);
}
.remainingCardsActiveRight {
  transform-origin: 0% 100%;
  transform: translate(13%, 0) rotate(-20deg);
}

.playerCardsRaus {
  color: var(--tac-red);
  position: absolute;
  font-size: calc(0.015 * var(--board-size-in-px));
  font-family: "tacfontregular";
}

.playerCardsRausTL {
  top: 2%;
  left: 2%;
}
.playerCardsRausTR {
  top: 2%;
  right: 2%;
}
.playerCardsRausBL {
  bottom: 2%;
  left: 12%;
  transform: rotate(180deg);
}
.playerCardsRausBR {
  bottom: 2%;
  right: 12%;
  transform: rotate(180deg);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.6s;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: none;
}
</style>