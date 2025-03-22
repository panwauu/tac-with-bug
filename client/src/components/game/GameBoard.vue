<template>
  <div
    id="gameboard"
    class="gameboard"
  >
    <BoardImage
      class="imgGameBoard"
      :n-players="miscState.nPlayers"
      :turned="positionStyles.turned ?? false"
      :style="`filter: brightness(${brightnessValue()});`"
      draggable="false"
    />
    <template v-if="positionStyles.initialized">
      <BallsImage
        v-for="(ball, index) in ballsState.getBalls(cardsState)"
        :key="`ball-${String(index)}`"
        class="gameElement ball"
        :class="{
          selectedBall: index === ballsState.selectedBall,
          ball4: miscState.players.length === 4,
          ball6: miscState.players.length === 6 && positionStyles.turned === false,
          ball6_turned: miscState.players.length === 6 && positionStyles.turned === true,
        }"
        :style="positionStyles.stylePositionBalls?.[rotatePosition(ball.position)]"
        :color="props.positionStyles.ballsColors?.[ball.player] ?? ''"
        :draggable="index in ballsState.playableBalls"
        @click="selectBall(Number(index))"
        @dragstart="dragStart($event, Number(index))"
        @dragend="dragStop"
      />
      <div
        v-for="(position, index) in cardsState.getPossiblePositions()"
        :key="`possiblePositions-${String(index)}`"
        alt="Zielpositionen der Kugeln"
        class="gameElement possiblePosition"
        :class="{
          ball4: miscState.players.length === 4,
          ball6: miscState.players.length === 6 && positionStyles.turned === false,
          ball6_turned: miscState.players.length === 6 && positionStyles.turned === true,
        }"
        :style="positionStyles.stylePositionBalls?.[rotatePosition(position)] as any"
        droppable
        @click="dropSuccess(position)"
        @drop="dropSuccess(position)"
        @dragenter.prevent
        @dragover.prevent
      >
        <div class="possiblePositionInner" />
      </div>
      <div class="gameElement textActionElement">
        <Button
          v-for="(textAction, index) in cardsState.getTextAction()"
          :key="`textAction-${String(index)}`"
          class="textActionButton"
          severity="danger"
          @click="performTextAction(textAction)"
        >
          {{ t(`Game.CardActionButton.${textAction}`) }}
        </Button>
      </div>

      <DiscardPile
        :misc-state="miscState"
        :position-styles="positionStyles"
        :discard-pile-state="discardPileState"
      />
      <PlayerInformation
        :misc-state="miscState"
        :position-styles="positionStyles"
      />
      <CardDeck
        :misc-state="miscState"
        :position-styles="positionStyles"
      />

      <EmojiIllustration
        :misc-state="miscState"
        :position-styles="positionStyles"
      />

      <div
        v-for="(player, index) in miscState.players"
        :key="`playerAnnotations-${String(index)}-${String(player)}`"
      >
        <div
          :class="`gameElement circle circleHome${miscState.players.length}${positionStyles.turned && miscState.players.length === 6 ? '_turned' : ''}`"
          :style="positionStyles.stylePositionHouse?.[index]"
        />
        <div
          v-if="miscState.players.length === 4"
          :class="`gameElement circle circleStart`"
          :style="positionStyles.stylePositionStart?.[index]"
        />
      </div>

      <template
        v-for="index in [...Array(miscState.nPlayers).keys()]"
        :key="`TradeSymbol-${index}`"
      >
        <div
          v-if="tradePending(Number(index))"
          :class="`gameElement cardFlyContainer cardFlyContainer${rotateIndex(Number(index))}${
            miscState.players.length === 6 ? (positionStyles.turned ? '-6_turned' : '-6') : ''
          }`"
        >
          <img
            alt="Tauschindikator"
            src="@/assets/cards/card.png"
            class="cardFly"
          />
        </div>
      </template>

      <TradeArrow
        v-if="miscState.tradeDirection !== 0"
        :class="`gameElement tauschDirectionArrow${positionStyles.turned ? '_turned' : ''} tauschDirectionArrow${miscState.tradeDirection}`"
      />

      <div
        v-if="miscState.coopCounter !== -1"
        class="gameElement cardCounterElement p-card"
        :style="positionStyles.stylePositionCoop"
      >
        <Tag
          class="cardCounterTag"
          value="TEAM-TAC"
        />
        <div class="cardCounter">{{ miscState.coopCounter }}</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import TradeArrow from '@/components/icons/TradeArrow.vue'
import BoardImage from '@/components/assets/BoardImage.vue'
import PlayerInformation from '@/components/game/PlayerInformation.vue'
import CardDeck from '@/components/game/CardDeck.vue'
import DiscardPile from '@/components/game/DiscardPile.vue'
import EmojiIllustration from './EmojiIllustration.vue'

import type { PositionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import type { BallsStateType } from '@/services/compositionGame/useBalls'
import type { CardsStateType } from '@/services/compositionGame/useCards'
import type { DiscardPileStateType } from '@/services/compositionGame/useDiscardPile'
import type { PerformMoveAction } from '@/services/compositionGame/usePerformMove'
import type { MoveBall, MoveText } from '@/../../server/src/sharedTypes/typesBall'
import { rotatePosition as rotatePositionImport } from '@/js/rotateBoard'
import BallsImage from '../assets/BallsImage.vue'

const props = defineProps<{
  positionStyles: PositionStylesState
  miscState: MiscStateType
  ballsState: BallsStateType
  cardsState: CardsStateType
  discardPileState: DiscardPileStateType
  performMove: (data: PerformMoveAction) => void
}>()

function rotatePosition(position: number) {
  return rotatePositionImport(position, props.positionStyles.nRotate, props.miscState.players.length)
}

function rotateIndex(index: number) {
  return (index + props.miscState.players.length - props.positionStyles.nRotate) % props.miscState.players.length
}

function tradePending(index: number): boolean {
  return 'tradeInformation' in props.miscState.players[index] && props.miscState.players[index].tradeInformation?.[1] === false
}

function selectBall(index: number): void {
  if (index in props.ballsState.playableBalls) {
    props.ballsState.setSelectedBall(index)
  }
}

function dragStart(evt: DragEvent, index: number): void {
  props.ballsState.resetSelectedBall()
  props.ballsState.setSelectedBall(index)
  if (evt.dataTransfer === null) {
    return
  }
  evt.dataTransfer.dropEffect = 'move'
  evt.dataTransfer.effectAllowed = 'move'
  evt.dataTransfer.setData('itemID', index.toString())
}

function dragStop(): void {
  props.ballsState.resetSelectedBall()
}

function dropSuccess(position: number): void {
  const move: MoveBall = [props.miscState.gamePlayer, props.cardsState.selectedCard, props.ballsState.selectedBall, position]
  props.performMove({
    ballAction: [props.ballsState.selectedBall, position],
    textAction: '',
    move: move,
  })
}

function performTextAction(textAction: string): void {
  const move: MoveText = [props.miscState.gamePlayer, textAction === 'beenden' ? 0 : props.cardsState.selectedCard, textAction === 'Karten weitergeben' ? 'narr' : textAction]
  props.performMove({
    ballAction: [],
    textAction: textAction,
    move: move,
  })
}

function brightnessValue() {
  if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return '1'
  }
  return props.miscState.players.length === 4 ? '0.75' : '0.9'
}
</script>

<style scoped lang="scss">
@import '../../js/tradeCardsStyles.css';
@import '../../js/narrCards.css';

.gameboard {
  display: flex;
  position: relative;
  height: 100%;
}

.imgGameBoard {
  align-self: flex-start;
  object-fit: contain;
  z-index: 0;
  height: 100%;
}

.sick-game-portrait-query .gameboard {
  width: 100% !important;
  height: auto !important;
}

.sick-game-portrait-query .imgGameBoard {
  width: 100% !important;
}

.gameElement {
  position: absolute;
}

.ball {
  transform: translate(-50%, -50%);
  transition:
    all 1.2s ease-in-out,
    opacity 0s;
  /* 1.2s are also in JS (1200) for Tac Animation */
  transition-timing-function: ease-in-out;
  z-index: 110;
}

.ball4 {
  width: 4.065%;
}

.ball6 {
  width: 3.6%;
}

.ball6_turned {
  width: 3.1%;
}

.selectedBall {
  opacity: 0.7;
}

.textActionElement {
  z-index: 350;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30%;
}

.textActionButton {
  max-width: 100%;
}

.possiblePosition {
  transform: translate(-50%, -50%);
  opacity: 0.5;
  z-index: 110;
}

.possiblePositionInner {
  padding-top: 100%;
  width: 100%;
  height: 0;
  border-radius: 50%;
  background: white;
}

.circle {
  box-sizing: border-box;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.circleHome4 {
  width: 11.3%;
  height: 11.3%;
  z-index: 10;
}

.circleHome6 {
  width: 10.5%;
  height: 9.09%;
  z-index: 10;
}

.circleHome6_turned {
  height: 10.5%;
  width: 9.09%;
  z-index: 10;
}

.circleStart {
  width: 5%;
  height: 5%;
  z-index: 10;
}

.cardCounterElement {
  display: flex;
  flex-direction: column;
}

.cardCounterTag {
  font-size: calc(1 / 100 * var(--board-size-in-px));
}

.cardCounter {
  font-size: calc(3.5 / 100 * var(--board-size-in-px));
  font-weight: bold;
  padding: 2px calc(0.02 * var(--board-size-in-px));
}

.tauschDirectionArrow_turned {
  top: 50.3%;
  left: 50.4%;
  height: 32.9%;
  opacity: 0.8;
}

.tauschDirectionArrow {
  top: 50.3%;
  left: 50.4%;
  height: 27.9%;
  opacity: 0.8;
}

.tauschDirectionArrow1 {
  transform: translate(-50%, -50%);
}

.tauschDirectionArrow-1 {
  transform: translate(-50%, -50%) rotateX(180deg);
}
</style>
