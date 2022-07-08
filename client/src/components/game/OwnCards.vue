<template>
  <div :class="{ cardsContainerOuter: true, cardsContainerOuterNotOwn: !own }">
    <div
      :class="{
        cardsContainer: true,
        cardsContainerTeufel: own && miscState.teufelFlag && miscState.players[miscState.gamePlayer].active,
      }"
    >
      <transition-group
        name="slideCard"
        @after-leave="recalculatePositions()"
      >
        <CardImage
          v-for="(card, index) in cardNames"
          :id="card.key"
          :key="card.key"
          :style="card.style"
          class="card ownCard clickable"
          :class="{
            cardNotPossible: !card.possible,
            cardSelected: index === cardsState.selectedCard,
            teufelOwnCards: own && miscState.teufelFlag && miscState.players[miscState.gamePlayer].active,
          }"
          :card="card.title"
          draggable="false"
          @click="clickCard"
        />
      </transition-group>
      <img
        v-if="own"
        alt="Platzhalter"
        class="card"
        src="@/assets/cards/cardPlaceholder.png"
        :draggable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import type { CardsStateType } from '@/services/compositionGame/useCards'
import { computed } from 'vue'
import CardImage from '../assets/CardImage.vue'

const props = defineProps<{
  miscState: MiscStateType
  cardsState: CardsStateType
  own: boolean
}>()

function clickCard(event: Event) {
  if (!(props.miscState.teufelFlag && props.miscState.players[props.miscState.gamePlayer].active && props.own)) {
    const id = parseInt((event.target as HTMLElement).id)
    props.cardsState.setSelectedCard(id)
  }
}

function recalculatePositions() {
  if (!(props.miscState.teufelFlag && props.miscState.players[props.miscState.gamePlayer].active && props.own)) {
    props.cardsState.setAnimationEnded()
  }
}

const cardNames = computed(() => {
  return props.cardsState.getCardNames(props.own)
})
</script>

<style scoped>
.cardsContainerOuter {
  width: 100%;
  padding: 7px;
}

.cardsContainerOuterNotOwn {
  top: 0;
  left: 0;
  position: absolute;
}

.cardsContainer {
  position: relative;
  width: 100%;
}

.cardsContainerTeufel {
  filter: opacity(0.2);
}

.card {
  border-radius: 9%/5.42%;
  width: 40%;
  margin: 18% 0 0 0;
  /* 18% also in JS!! */
}

.ownCard {
  position: absolute;
  transition: left 1s, margin 0.5s;
  box-shadow: 0px 0px 10px -5px black;
}

@media (hover: hover) and (pointer: fine) {
  .ownCard:hover {
    margin: 0 0 18% 0;
    /* 18% also in JS!! */
  }
}

.cardNotPossible {
  filter: grayscale(100) brightness(0.7);
}

.cardSelected {
  margin: 0 0 18% 0;
  /* 18% also in JS!! */
}

@keyframes slide-in {
  0% {
    transform: translateY(+100%);
  }

  100% {
    transform: translateY(0%);
  }
}

@keyframes disappearCard {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 0;
  }
}

.slideCard-enter-active {
  animation: slide-in 2s;
}

.slideCard-leave-active {
  animation: slide-in 1s reverse;
}

.teufelOwnCards {
  filter: grayscale(1);
  cursor: unset;
  margin: 0 0 18% 0;
  /* 18% also in JS!! */
}
</style>
