<template>
  <div class="waitingGame p-card">
    <div :class="`waitingGameHeader ${active ? '' : 'noWrapHeader'}`">
      <Tag
        severity="success"
        class="status-badge"
      >
        {{ active ? t('Waiting.Icons.players', { X: game.nPlayers }) : game.nPlayers }}
        <PlayersTwo
          v-if="game.nPlayers === 4"
          class="Symbol SymbolMargin"
        />
        <PlayersThree
          v-else
          class="Symbol SymbolMargin"
        />
      </Tag>
      <Tag
        severity="danger"
        class="status-badge"
      >
        {{ active ? t('Waiting.Icons.teams', { count: game.nTeams, X: game.nTeams }) : game.nTeams }}
        <Teams
          :n-teams="game.nTeams"
          class="Symbol SymbolMargin"
        />
      </Tag>
      <Tag
        severity="warn"
        class="status-badge"
      >
        {{ active ? t(`Waiting.Icons.${game.meister ? 'meister' : 'normal'}`) : '' }}
        <Brain
          v-if="game.meister"
          :color="'primary'"
          :class="`Symbol ${active ? 'SymbolMargin' : ''}`"
        />
        <Heart
          v-else
          :color="'primary'"
          :class="`Symbol ${active ? 'SymbolMargin' : ''}`"
        />
      </Tag>
      <Tag class="status-badge">
        {{ active ? t(`Waiting.Icons.${game.private ? 'private' : 'public'}`) : '' }}
        <i
          :class="`pi pi-lock${game.private ? '' : '-open'} Symbol ${active ? 'SymbolMargin' : ''}`"
          aria-hidden="true"
        />
      </Tag>
    </div>
    <div
      v-for="(teamIndex1, teamIndex) in game.nTeams"
      :key="`team-${String(teamIndex)}`"
      class="teamContainer"
    >
      <div class="teamTag">TEAM {{ teamIndex1 }}</div>
      <div class="teamBody">
        <div
          v-for="index in [...Array(game.nPlayers / game.nTeams).keys()]"
          :key="`playerKey-${game.id}-${index}-${String(teamIndex)}`"
          class="playerSlot"
        >
          <div
            v-if="game.players[playerIndex(Number(teamIndex), index)] != null || game.bots[playerIndex(Number(teamIndex), index)] != null"
            class="playerContainer"
          >
            <div
              v-if="
                active &&
                game.players
                  .slice(0, game.nPlayers)
                  .filter((_, i) => game.bots[i] == null)
                  .every((p) => p != null)
              "
              class="readyIcon"
            >
              <i
                v-if="
                  (game.players[playerIndex(Number(teamIndex), index)] != null && game.ready[playerIndex(Number(teamIndex), index)]) ||
                  game.bots[playerIndex(Number(teamIndex), index)] != null
                "
                class="pi pi-check"
                style="color: green"
              />
              <i
                v-if="game.players[playerIndex(Number(teamIndex), index)] != null && !game.ready[playerIndex(Number(teamIndex), index)]"
                class="pi pi-spin pi-spinner"
                style="color: red"
              />
            </div>
            <BallsImage
              v-if="activeAndNotNull(playerIndex(Number(teamIndex), index))"
              :class="[
                'playerBall',
                game.players[playerIndex(Number(teamIndex), index)] === username || (game.bots[playerIndex(Number(teamIndex), index)] != null && game.admin === username)
                  ? 'clickable'
                  : '',
              ]"
              :color="game.balls[playerIndex(Number(teamIndex), index)]"
              @click="toggle($event, playerIndex(Number(teamIndex), index))"
            />
            <PlayerWithPicture
              :username="game.players[playerIndex(Number(teamIndex), index)] ?? t('Waiting.bot')"
              :hide-if-empty="true"
              :name-first="false"
              :clickable="active"
              :bot="game.bots[playerIndex(Number(teamIndex), index)] != null"
            />
            <div
              v-if="game.adminID === game.playerIDs[playerIndex(Number(teamIndex), index)]"
              style="margin-left: 5px"
            >
              {{ `(${t('Waiting.adminBadge')})` }}
            </div>
          </div>
          <div v-else>
            <Button
              v-if="active && game.admin === username"
              severity="secondary"
              :label="`+ ${t('Waiting.bot')}`"
              @click="() => emit('add-bot', { gameID: game.id, botID: 3, playerIndex: playerIndex(Number(teamIndex), index) })"
            />
          </div>
          <div class="playerControls">
            <div
              v-if="activeAndSelfOrAdmin(playerIndex(Number(teamIndex), index))"
              class="buttonUpDownSet"
            >
              <Button
                icon="pi pi-angle-up"
                class="buttonUpDown"
                text
                rounded
                severity="secondary"
                size="small"
                :disabled="playerIndex(Number(teamIndex), index) <= 0"
                @click="movePlayerOrBot(game.id, playerIndex(Number(teamIndex), index), -1)"
              />
              <Button
                icon="pi pi-angle-down"
                class="buttonUpDown"
                text
                rounded
                severity="secondary"
                size="small"
                :disabled="playerIndex(Number(teamIndex), index) >= game.nPlayers - 1"
                @click="movePlayerOrBot(game.id, playerIndex(Number(teamIndex), index), 1)"
              />
            </div>
            <Button
              v-if="activeAndSelfOrAdmin(playerIndex(Number(teamIndex), index))"
              icon="pi pi-times"
              text
              rounded
              severity="danger"
              @click="removePlayerOrBot(playerIndex(Number(teamIndex), index))"
            />
          </div>
        </div>
      </div>
    </div>
    <Popover ref="opRef">
      <BallsImage
        v-for="color in colors"
        :key="`overlayBall-${color}`"
        class="playerBall clickable"
        :color="color"
        @click="switchColor(color)"
      />
    </Popover>
    <div
      v-if="active"
      class="footerWithButtons p-card-footer"
    >
      <Button
        :label="t('Waiting.leaveButton')"
        icon="pi pi-sign-out"
        severity="danger"
        @click="removePlayer(username ?? '')"
      />
      <Button
        :label="t('Waiting.readyButton')"
        icon="pi pi-caret-right"
        severity="success"
        :disabled="game.players.slice(0, game.nPlayers).some((p, i) => p === null && game.bots[i] == null) || game.ready.find((_, index) => game.players[index] === username)"
        @click="setPlayerReady()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import PlayerWithPicture from './PlayerWithPicture.vue'
import Brain from '@/components/icons/BrainSymbol.vue'
import Heart from '@/components/icons/HeartSymbol.vue'
import PlayersTwo from '@/components/icons/PlayersTwo.vue'
import PlayersThree from '@/components/icons/PlayersThree.vue'
import Teams from '@/components/icons/TeamsSymbol.vue'
import Tag from 'primevue/tag'

import type { WaitingGame } from '@/../../server/src/sharedTypes/typesWaiting'
import { computed, ref } from 'vue'
import { username } from '@/services/useUser'

import BallsImage from './assets/BallsImage.vue'

const props = withDefaults(defineProps<{ game: WaitingGame; active?: boolean }>(), { active: false })

const emit = defineEmits<{
  'add-bot': [data: { gameID: number; botID: number; playerIndex: number }]
  'move-player': [data: { gameID: number; username: string; steps: number }]
  'move-bot': [data: { gameID: number; playerIndex: number; steps: number }]
  'remove-player': [username: string]
  'remove-bot': [data: { gameID: number; playerIndex: number }]
  'ready-player': [gameID: number]
  'color-player': [username: string, gameID: number, color: string, botIndex: number | null]
}>()

const { t } = useI18n()

const opRef = ref<InstanceType<typeof Popover> | null>(null)

const colors = computed(() => {
  return ['black', 'blackWhite', 'blue', 'green', 'orange', 'red', 'melone', 'white', 'turquoise', 'pink', 'yellow'].filter((c) => !props.game.balls.some((b) => b === c))
})

const playerIndex = (teamIndex: number, index: number) => {
  return index + teamIndex * (props.game.nPlayers / props.game.nTeams)
}

const activeAndNotNull = (index: number) => {
  return (props.game.players[index] != null || props.game.bots[index] != null) && props.active
}

const activeAndSelf = (index: number) => {
  return props.game.players[index] != null && props.active && props.game.players[index] === username.value
}

const activeAndSelfOrAdmin = (index: number) => {
  return (
    props.active &&
    ((props.game.players[index] != null && (props.game.players[index] === username.value || props.game.admin === username.value)) ||
      (props.game.bots[index] != null && props.game.admin === username.value))
  )
}

const movePlayerOrBot = (gameID: number, index: number, steps: number) => {
  if (props.game.players[index] != null) {
    emit('move-player', {
      gameID,
      username: props.game.players[index],
      steps: steps,
    })
  }
  if (props.game.bots[index] != null) {
    emit('move-bot', { gameID, playerIndex: index, steps: steps })
  }
}

const removePlayer = (usernameToRemove: string) => {
  emit('remove-player', usernameToRemove)
}

const removePlayerOrBot = (index: number) => {
  if (props.game.players[index] != null) emit('remove-player', props.game.players[index])
  if (props.game.bots[index] != null) emit('remove-bot', { gameID: props.game.id, playerIndex: index })
}

const setPlayerReady = () => {
  emit('ready-player', props.game.id)
}

let playerIndexForColorChange: number | null = null
const toggle = (event: Event, index: number) => {
  playerIndexForColorChange = index
  if (activeAndSelf(index) || (props.game.bots[index] != null && props.game.admin === username.value)) {
    opRef.value?.toggle(event)
  }
}

const switchColor = (color: string) => {
  opRef.value?.hide()
  emit('color-player', username.value ?? '', props.game.id, color, playerIndexForColorChange)
}
</script>

<style scoped>
.waitingGame {
  flex: 0 0 200px;
  margin: 15px;
  min-height: 200px;
  padding: 10px;
  background-color: var(--background-contraster);
}

.waitingGameHeader {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
}

.noWrapHeader {
  flex-wrap: nowrap;
}

.status-badge {
  text-transform: uppercase;
  margin: 2px;
}

.SymbolMargin {
  margin-left: 5px;
}

.Symbol {
  height: 20px;
  width: auto;
  object-fit: contain;
}

.buttonUpDownSet {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.buttonUpDown {
  width: 15px !important;
  height: 15px !important;
}

.teamContainer {
  margin: 20px 0px 0px 0px;
}

.teamTag {
  font-weight: bold;
  text-align: left;
  font-size: 0.6rem;
}

.teamBody {
  background: var(--background-contrastest);
  border-radius: 5px;
  padding: 5px;
}

.playerSlot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
}

.playerContainer {
  display: flex;
  align-items: center;
  justify-content: center;
}

.playerControls {
  display: flex;
  align-items: center;
  justify-content: center;
}

.playerBall {
  object-fit: contain;
  height: 1.8rem;
  margin: 0 8px;
}

.footerWithButtons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
</style>
