<template>
  <div style="width: 100%; height: 100%">
    <GameComponent
      v-if="u != null"
      v-model:modal-visible="modalVisible"
      v-model:modal-state="modalState"
      :position-styles="positionStyles"
      :misc-state="miscState"
      :discard-pile-state="discardPileState"
      :balls-state="ballsState"
      :perform-move="spielerZug"
      :cards-state="cardsState"
      :instructions-state="instructionsState"
      :update-data="updateData"
      seite-hochkant
      @close-game="router.push({ name: 'Training' })"
    >
      <template #seite>
        <div class="aufgabe p-card">
          <Tag :value="txt(u.kicker, locale)" />
          <h3>{{ txt(u.titel, locale) }}</h3>
          <p v-if="vorher">{{ vorher }}</p>
          <p class="aufgabe-text">{{ txt(u.aufgabe, locale) }}</p>

          <div
            v-if="quiz"
            class="quiz"
          >
            <div class="quiz-antworten">
              <Button
                v-for="a in quizAntworten"
                :key="a.wert"
                :label="a.text"
                severity="secondary"
                :disabled="geloest"
                @click="antworte(a.wert)"
              />
            </div>
            <Message
              v-if="falsch"
              severity="warn"
              :closable="false"
            >
              {{ t('Training.falsch') }}
            </Message>
          </div>

          <Button
            v-if="!geloest"
            :label="tippOffen ? t('Training.tippZu') : t('Training.tipp')"
            icon="pi pi-lightbulb"
            severity="secondary"
            text
            @click="tippOffen = !tippOffen"
          />
          <p
            v-if="tippOffen && !geloest"
            class="tipp"
          >
            {{ txt(u.tipp, locale) }}
          </p>

          <Message
            v-if="geloest"
            severity="success"
            :closable="false"
          >
            {{ txt(u.erfolg, locale) }}
          </Message>
          <Message
            v-if="!geloest && sackgasse"
            severity="warn"
            :closable="false"
          >
            {{ t('Training.sackgasse') }}
          </Message>
          <div class="knoepfe">
            <Button
              v-if="geloest && weiterZiel"
              :label="t('Training.weiter')"
              icon="pi pi-angle-right"
              icon-pos="right"
              @click="weiter()"
            />
            <Button
              :label="t('Training.nochmal')"
              icon="pi pi-refresh"
              severity="secondary"
              @click="starte()"
            />
            <Button
              :label="t('Training.uebersicht')"
              icon="pi pi-list"
              severity="secondary"
              text
              @click="router.push({ name: 'Training' })"
            />
          </div>
        </div>
      </template>
    </GameComponent>
  </div>
</template>

<script setup lang="ts">
// Eine Übung aus dem Training der App, im Browser auf Oskars Spieloberfläche.
// Stellung, Karten und Erfolgsbedingung kommen aus der App; ob ein Zug
// erlaubt ist, entscheidet Oskars Engine. Kein Server beteiligt.
import GameComponent from '@/components/game/GameComponent.vue'
import { computed, ref, watch, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useI18n } from 'vue-i18n'
import type { Game } from '@repo/core/game/game'
import { getPlayerUpdateFromGame } from '@repo/core/game/serverOutput'
import type { GameForPlay, UpdateDataType, MoveTextOrBall } from '@repo/core/types'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { type PerformMoveAction, usePerformMove } from '@/services/compositionGame/usePerformMove'
import { useCards } from '@/services/compositionGame/useCards'
import { useInstructions } from '@/services/compositionGame/useInstructions'
import router from '@/router/index'
import { uebung, txt, markiere, naechstes, training } from '@/training'
import { baueSpiel, fuehreAus, ICH, kugel } from '@/training/spielstand'
import { istGeloest, type Verlauf } from '@/training/pruefung'
import { FARBEN, type Uebung } from '@/training/typen'

const { t, locale } = useI18n()

const miscState = useMisc(4)
const positionStyles = usePositionStyles(miscState)
const discardPileState = useDiscardPile(miscState.gamePlayer)
const ballsState = useBalls()
const cardsState = useCards(ballsState, miscState)
const performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState)
const instructionsState = useInstructions(miscState, ballsState, cardsState)
const updateData = ref<null | UpdateDataType>(null)
const modalVisible = ref(false)
const modalState = ref('settings')

const id = computed(() => String(router.currentRoute.value.query.id ?? ''))
const u = computed(() => uebung(id.value))
const geloest = ref(false)
const tippOffen = ref(false)
const sackgasse = ref(false)
const falsch = ref(false)
let game: Game | null = null
let spiel: GameForPlay | null = null
let verlauf: Verlauf = { zuege: [], karten: [] }
let m03Teil1 = false

const quiz = computed(() => u.value?.quizMelden != null || u.value?.quizRundenstart != null)

function farbname(s: number) {
  return t(`Training.farbe.${FARBEN[s]}`)
}

const quizAntworten = computed(() => {
  if (u.value?.quizMelden != null) return [0, 1, 2, 3, 4].map((n) => ({ wert: n, text: String(n) }))
  return [0, 1, 2, 3].map((s) => ({ wert: s, text: farbname(s) }))
})

function antworte(wert: number) {
  const richtig = u.value?.quizMelden ?? u.value?.quizRundenstart
  falsch.value = wert !== richtig
  if (!falsch.value) loese()
}

/** Was vorher geschah (TAC-Übungen, Teufel, Aussetzen). */
const vorher = computed(() => {
  const x = u.value
  if (x == null) return ''
  const wer = (s: number | null) => farbname(s ?? 1)
  if (x.vorzuege != null) {
    return x.vorzuege.map((v) => t('Training.vorherZug', { wer: wer(v.sitz), karte: kartenName(v.karte) })).join(' ')
  }
  if (x.letzteKarte != null) return t('Training.vorherZug', { wer: wer(x.vorSpieler), karte: kartenName(x.letzteKarte) })
  if (x.ausgesetzt) return t('Training.ausgesetzt')
  return ''
})

function kartenName(k: string) {
  return /^\d+$/.test(k) ? k : k.toUpperCase() === 'TAC' ? 'TAC' : k.charAt(0).toUpperCase() + k.slice(1)
}

function zeige() {
  if (spiel) updateData.value = getPlayerUpdateFromGame(spiel, ICH)
}

function starte(teil: 'start' | 'm03' = u.value?.id === 's_m03' ? 'm03' : 'start') {
  const x = u.value
  if (x == null) return
  geloest.value = false
  tippOffen.value = false
  sackgasse.value = false
  falsch.value = false
  verlauf = { zuege: [], karten: [] }
  m03Teil1 = teil === 'm03'
  game = baueSpiel(x, teil)
  spiel = {
    id: 0,
    game,
    colors: [...FARBEN],
    rematch_open: false,
    substitution: null,
    running: true,
    nPlayers: 4,
    nTeams: 2,
    coop: false,
    created: Date.now(),
    lastPlayed: Date.now(),
    publicTournamentId: null,
    privateTournamentId: null,
    players: [t('Training.du'), farbname(1), farbname(2), farbname(3)],
    bots: [null, 0, 0, 0],
    playerIDs: [null, null, null, null],
  }
  setTimeout(() => positionStyles.onResize(), 50)
  zeigeVorzug(x, teil)
}

/**
 * Der letzte Zug vor der Übung (TAC-Aufgaben): erst das Brett davor zeigen,
 * dann läuft der Zug sichtbar ab, wie in der App. So sieht man, was TAC
 * gleich rückgängig macht.
 */
let vorzugUhr: ReturnType<typeof setTimeout> | null = null
const vorzugLaeuft = ref(false)
function zeigeVorzug(x: Uebung, teil: 'start' | 'm03') {
  if (vorzugUhr) clearTimeout(vorzugUhr)
  if (spiel == null || game == null || teil !== 'start' || x.kugelnVorher == null) {
    vorzugLaeuft.value = false
    zeige()
    return
  }
  const echt = getPlayerUpdateFromGame(spiel, ICH)
  updateData.value = {
    ...echt,
    balls: structuredClone(game.priorBalls),
    discardPile: echt.discardPile.slice(0, -1),
    cards: echt.cards.map((c) => ({ ...c, possible: false, ballActions: {}, textAction: '' })),
  }
  vorzugLaeuft.value = true
  vorzugUhr = setTimeout(() => {
    vorzugLaeuft.value = false
    zeige()
  }, 1400)
}

function loese() {
  geloest.value = true
  if (u.value) markiere(u.value.id)
}

/** Mein Zug aus der Oberfläche. */
function spielerZug(aktion: PerformMoveAction) {
  if (game == null || geloest.value || quiz.value || vorzugLaeuft.value) return
  const zug: MoveTextOrBall = performMove(aktion)
  if (!game.checkMove(zug)) {
    console.error('Zug abgelehnt', zug)
    zeige()
    return
  }
  const karte = game.cardsWithMoves[zug[1]]?.title ?? game.cards.players[ICH][zug[1]] ?? ''
  fuehreAus(game, zug)
  verlauf = { zuege: [...verlauf.zuege, zug], karten: [...verlauf.karten, karte] }
  zeige()
  const x = u.value
  if (x == null) return
  // „Vier TACs in Folge": nach dem Herauskommen spielen die anderen TAC.
  if (m03Teil1 && kugel(game, ICH, 0).ring != null) {
    setTimeout(() => starte('start'), 900)
    return
  }
  const tausch = x.id === 's_g12b' && zug[2] === 'tauschen' && (karte === '13' || karte === '1')
  if (tausch || istGeloest(x, game, verlauf)) {
    loese()
    return
  }
  // Keine Karte mehr oder nichts mehr spielbar: nochmal von vorn.
  // Nur noch Abwerfen möglich zählt auch als Sackgasse: lösen lässt sich die Übung so nicht mehr.
  const nochWas =
    game.cardsWithMoves.some((c) => c.possible && c.textAction.split('+').some((a) => a !== 'abwerfen' && a !== '')) ||
    game.cardsWithMoves.some((c) => c.possible && Object.keys(c.ballActions).length > 0)
  sackgasse.value = game.cards.players[ICH].length === 0 || !nochWas || x.id === 's_g12b'
}

/** Nächstes Feld: erst weitere Übungen derselben Lektion, dann der Lernpfad. */
const weiterZiel = computed(() => {
  const x = u.value
  if (x == null) return null
  const l = training.lektionen.find((le) => le.uebungen.includes(x.id))
  if (l) {
    const i = l.uebungen.indexOf(x.id)
    if (i + 1 < l.uebungen.length) return { art: 'uebung' as const, id: l.uebungen[i + 1] }
    return naechstes(l.id)
  }
  return naechstes(x.id)
})

function weiter() {
  const z = weiterZiel.value
  if (z == null) return
  if (z.art === 'lektion') router.push({ name: 'TrainingLektion', params: { id: z.id } })
  else router.push({ name: 'TrainingUebung', query: { id: z.id } })
}

watch(id, () => starte())
onMounted(() => {
  if (u.value == null) router.replace({ name: 'Training' })
  else starte()
})
</script>

<style scoped>
.aufgabe {
  width: 100%;
  max-width: 360px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.aufgabe h3 {
  margin: 4px 0;
}
.aufgabe p {
  margin: 0;
}
.aufgabe-text {
  font-weight: bold;
}
.tipp {
  font-size: 0.95em;
  opacity: 0.85;
}
.quiz-antworten {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}
.knoepfe {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
</style>
