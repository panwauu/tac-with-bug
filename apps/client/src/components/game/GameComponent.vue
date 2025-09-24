<template>
  <div
    id="gameView"
    ref="gameViewRef"
    class="gameView"
    :class="[gameBoardPortrait ? 'sick-game-portrait-query' : '']"
  >
    <Menubar
      class="portaitMenu"
      :model="portraitMenu"
    >
      <template #start>
        <div
          class="navLogo clickable"
          @click="$emit('closeGame')"
        >
          <TwbSymbol
            style="height: 100%"
            side="left"
          />
          <div
            class="twbLetters"
            style="font-size: 38px; color: var(--tac-text-color)"
          >
            TWB
          </div>
          <TwbSymbol
            style="height: 100%"
            side="right"
          />
        </div>
      </template>
    </Menubar>

    <div class="game">
      <div class="gameAdditionalInfo">
        <div class="logoLandscape">
          <TwbLogo
            style="width: 100%"
            class="clickable"
            @click="$emit('closeGame')"
          />
          <div class="landscapeMenuButtonContainer">
            <Button
              aria-label="Statistics"
              icon="pi pi-chart-bar"
              class="landscapeMenuButton"
              rounded
              severity="success"
              @click="openModal('statistic')"
            />
            <Button
              aria-label="Settings"
              icon="pi pi-cog"
              class="landscapeMenuButton"
              rounded
              severity="secondary"
              @click="openModal('settings')"
            />
            <Button
              aria-label="Help"
              icon="pi pi-question"
              class="landscapeMenuButton"
              severity="info"
              rounded
              @click="openModal('assistance')"
            />
            <Button
              aria-label="Substitution"
              icon="pi pi-arrows-h"
              severity="warn"
              class="landscapeMenuButton"
              rounded
              :class="updateData?.substitution != null ? 'blink-animation' : ''"
              @click="openModal('substitution')"
            />
            <GameWatchingPlayers
              aria-label="Watching Players"
              :display-text="false"
              :n-watching="miscState.watchingData.nWatchingPlayers"
              :watching-players="miscState.watchingData.watchingPlayerNames"
            />
          </div>
        </div>
        <div
          v-if="miscState.viewerMode"
          class="instructions p-card"
        >
          <Tag
            :value="t('Game.viewerModeTag')"
            icon="pi pi-eye"
            style="margin: 20px"
          />
          <div>{{ t('Game.viewerModeText') }}</div>
        </div>
        <div class="cardsContainer">
          <OwnCards
            :cards-state="cardsState"
            :misc-state="miscState"
            :own="true"
          />
          <OwnCards
            :cards-state="cardsState"
            :misc-state="miscState"
            :own="false"
          />
        </div>
        <div
          v-if="!miscState.viewerMode"
          class="instructions p-card"
        >
          <div
            v-for="(line, index) in instructionsState.instructions"
            :key="`Instruction-${String(index)}`"
          >
            {{ line }}
          </div>
        </div>
      </div>
      <GameBoard
        :position-styles="positionStyles"
        :misc-state="miscState"
        :balls-state="ballsState"
        :cards-state="cardsState"
        :discard-pile-state="discardPileState"
        :perform-move="performMove"
      />
    </div>
    <div
      v-if="!miscState.gameRunning && !miscState.viewerMode"
      class="endedOverlay"
    >
      <div class="endedCard p-card">
        <div class="endedText">{{ miscState.gameEndedText }}</div>
        <Button
          class="endedButton"
          :label="t('Game.EndedOverlay.backButton')"
          @click="router.push({ name: 'Landing' })"
        />
        <Fieldset
          :legend="t('Game.EndedOverlay.statistic')"
          :toggleable="true"
          :collapsed="true"
        >
          <GameStatistic
            v-if="statisticState != null"
            class="statistic"
            :statistic-state="statisticState"
            :misc-state="miscState"
            :update-data="updateData"
          />
        </Fieldset>
        <Fieldset
          v-if="miscState.tournamentID === null"
          :legend="t('Game.Rematch.title')"
          :toggleable="true"
          :collapsed="false"
        >
          <RematchForm
            :misc-state="miscState"
            :position-styles="positionStyles"
          />
        </Fieldset>
      </div>
    </div>

    <Dialog
      v-model:visible="modalVisibleLocal"
      :header="t(`Game.GameModal.title.${modalStateLocal}`)"
      :modal="true"
      :dismissable-mask="true"
    >
      <GameStatistic
        v-if="modalStateLocal === 'statistic' && statisticState != null"
        class="statistic"
        :statistic-state="statisticState"
        :misc-state="miscState"
        :update-data="updateData"
      />
      <GameModalSettings
        v-if="modalStateLocal === 'settings'"
        :n-players="miscState.nPlayers"
        :misc-state="miscState"
      />
      <GameModalAssistance v-if="modalStateLocal === 'assistance'" />
      <GameModalSubstitution
        v-if="modalStateLocal === 'substitution'"
        :update-data="updateData"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Menubar from 'primevue/menubar'
import Dialog from 'primevue/dialog'
import GameBoard from '@/components/game/GameBoard.vue'
import OwnCards from '@/components/game/OwnCards.vue'
import GameModalSettings from '@/components/gameModal/GameModalSettings.vue'
import GameModalAssistance from '@/components/gameModal/GameModalAssistance.vue'
import GameModalSubstitution from '@/components/gameModal/GameModalSubstitution.vue'
import GameStatistic from '@/components/game/GameStatistic.vue'
import Fieldset from 'primevue/fieldset'
import RematchForm from './RematchForm.vue'
import TwbSymbol from '@/components/icons/TwbSymbol.vue'
import TwbLogo from '@/components/icons/TwbLogo.vue'
import GameWatchingPlayers from './GameWatchingPlayers.vue'

import type { PositionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import type { BallsStateType } from '@/services/compositionGame/useBalls'
import type { CardsStateType } from '@/services/compositionGame/useCards'
import type { DiscardPileStateType } from '@/services/compositionGame/useDiscardPile'
import type { InstructionsStateType } from '@/services/compositionGame/useInstructions'
import type { StatisticStateType } from '@/services/compositionGame/useStatistic'
import type { PerformMoveAction } from '@/services/compositionGame/usePerformMove'
import type { UpdateDataType } from '@repo/core/types'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import router from '@/router'
import { useResizeObserver } from '@vueuse/core'

const emit = defineEmits<{ closeGame: []; 'update:modalVisible': [value: boolean]; 'update:modalState': [value: string] }>()

const props = defineProps<{
  positionStyles: PositionStylesState
  miscState: MiscStateType
  statisticState?: StatisticStateType
  ballsState: BallsStateType
  cardsState: CardsStateType
  discardPileState: DiscardPileStateType
  performMove: (data: PerformMoveAction) => void
  instructionsState: InstructionsStateType
  modalVisible: boolean
  modalState: string
  updateData: UpdateDataType | null
}>()

watch(() => props.updateData, updateHandler, { deep: true })

async function updateHandler(): Promise<void> {
  if (props.updateData == null) {
    return
  }

  props.miscState.setGamePlayer(props.updateData.gamePlayer)

  const tacFirstRevertState =
    props.discardPileState.discardPile.length > 0 &&
    props.discardPileState.discardPile.length + 1 === props.updateData.discardPile.length &&
    props.updateData.discardPile[props.updateData.discardPile.length - 1].startsWith('tac') &&
    !props.updateData.discardedFlag &&
    !props.miscState.players[props.miscState.gamePlayer].active

  props.miscState.setFlags(props.updateData)
  props.miscState.setDeckInfo(props.updateData.deckInfo)
  props.miscState.setCoopCounter(props.updateData.coopCounter)
  props.miscState.setTradeDirection(props.updateData.players, props.updateData.tradeDirection === 1 ? 1 : -1)
  props.miscState.setPlayers(props.updateData.players)
  props.miscState.setGameRunning(
    props.updateData.gameEnded,
    props.updateData.running,
    props.updateData.players,
    props.updateData.winningTeams,
    props.updateData.coopCounter,
    props.miscState.gamePlayer
  )
  props.miscState.setTimestamps(props.updateData.created, props.updateData.lastPlayed)
  props.positionStyles.setBallsColors(props.updateData.colors)
  props.statisticState?.setStatistic(props.updateData, props.positionStyles.getHexColors())
  props.discardPileState.updateDiscardPile(props.updateData.discardPile, props.updateData.players, props.updateData.cards, props.positionStyles)

  if (tacFirstRevertState) {
    props.ballsState.updateBallsState(props.ballsState.priorBalls, props.ballsState.priorBalls)
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(null)
      }, 1200)
    }) // 1.2s are also in CSS for balls
  }
  props.ballsState.updateBallsState(props.updateData.balls, props.updateData.priorBalls)
  props.cardsState.updateCards(props.updateData.cards, props.updateData.ownCards)
}

const modalVisibleLocal = computed({
  get() {
    return props.modalVisible
  },
  set(value: boolean) {
    emit('update:modalVisible', value)
  },
})

const modalStateLocal = computed({
  get() {
    return props.modalState
  },
  set(value: string) {
    emit('update:modalState', value)
  },
})

function openModal(str: string) {
  if (router.currentRoute.value.name !== 'Game' && str === 'statistic') {
    return
  }
  modalStateLocal.value = str
  modalVisibleLocal.value = true
}

const portraitMenu = ref(getMenu(true))

function getMenu(displayText: boolean) {
  return [
    {
      label: displayText ? t('Game.GameModal.title.statistic') : '',
      icon: 'pi pi-chart-bar',
      command: () => {
        openModal('statistic')
      },
    },
    {
      label: displayText ? t('Game.GameModal.title.settings') : '',
      icon: 'pi pi-cog',
      command: () => {
        openModal('settings')
      },
    },
    {
      label: displayText ? t('Game.GameModal.title.assistance') : '',
      icon: 'pi pi-question',
      command: () => {
        openModal('assistance')
      },
    },
    {
      label: displayText ? t('Game.GameModal.title.substitution') : '',
      icon: 'pi pi-arrows-h',
      command: () => {
        openModal('substitution')
      },
    },
  ]
}

const gameBoardPortrait = ref(false)
const gameViewRef = ref<HTMLElement | null>()

onMounted(() => {
  onResize()
  nextTick(() => onResize())
})
useResizeObserver(gameViewRef, () => {
  onResize()
})

function onResize() {
  if (gameViewRef.value == null) {
    console.error('gameViewRef not populated')
    return
  }

  const gameViewBounding = gameViewRef.value.getBoundingClientRect()
  portraitMenu.value = getMenu(gameViewBounding.width > 600)
  gameBoardPortrait.value = gameViewBounding.height + 80 > gameViewBounding.width

  const gameboard = document.getElementById('gameboard')
  if (gameboard == null) {
    console.error('gameboard ref not populated')
    return
  }
  const gameBoardSize = Math.max(gameboard.getBoundingClientRect().height, gameboard.getBoundingClientRect().width)
  gameViewRef.value.style.setProperty('--board-size-in-px', gameBoardSize === 0 ? '100vmin' : `${gameBoardSize}px`)
}
</script>

<style scoped>
.gameView {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  --board-size-in-px: 100vmin;
}

.game {
  flex-grow: 1;
  width: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  height: 100%;
}

.gameAdditionalInfo {
  order: 0;
  flex: 1 1 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  max-width: min(45%, 355px);
}

.logoLandscape {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.logo {
  max-width: 40vw;
}

.portaitMenu {
  display: none;
}

.instructions {
  margin: 5px;
  padding: 10px;
  max-width: 100%;
}

.endedOverlay {
  position: absolute;
  display: block;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #c9c9c9a0;
  z-index: 1000;
}

.endedCard {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.endedText {
  margin-bottom: 15px;
}

.endedButton {
  margin-bottom: 20px;
}

.statistic {
  padding: 5px;
  width: 90vw;
  max-width: 500px;
}

.navLogo {
  display: flex;
  height: 30px;
}

.landscapeMenuButtonContainer {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 5px;
  width: 100%;
  justify-content: space-evenly;
}

.cardsContainer {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.sick-game-portrait-query .game {
  overflow-y: auto;
  flex-direction: column !important;
}

.sick-game-portrait-query .gameAdditionalInfo {
  order: 2 !important;
  max-width: 100% !important;
  width: 100% !important;
}

.sick-game-portrait-query .cardsContainer {
  max-width: 355px !important;
  overflow: visible;
}

.sick-game-portrait-query .logoLandscape {
  display: none !important;
}

.sick-game-portrait-query .portaitMenu {
  display: flex !important;
}

.sick-game-portrait-query .statistic {
  width: 70vw !important;
}

@keyframes grow {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.3);
  }
}
.blink-animation {
  animation-name: grow;
  animation-duration: 0.5s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-direction: alternate;
}
</style>
