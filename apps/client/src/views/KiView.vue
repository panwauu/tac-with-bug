<template>
  <div style="width: 100%; height: 100%">
    <GameComponent
      v-if="stufe != null"
      v-model:modal-visible="modalVisible"
      v-model:modal-state="modalState"
      :position-styles="positionStyles"
      :misc-state="miscState"
      :statistic-state="statisticState"
      :discard-pile-state="discardPileState"
      :balls-state="ballsState"
      :perform-move="spielerZug"
      :cards-state="cardsState"
      :instructions-state="instructionsState"
      :update-data="updateData"
      :neue-partie="neuesSpiel"
      @close-game="schliesse()"
    >
      <template
        v-if="modus === 'koop'"
        #seite
      >
        <div
          ref="koopSeite"
          class="koop-seite"
        >
          <div
            v-if="koopSeiteBreit"
            class="koop-zaehler p-card"
          >
            <Tag value="TEAM-TAC" />
            <div class="koop-zahl">{{ miscState.coopCounter }}</div>
            <div class="koop-titel">{{ t('Ki.koopKarten') }}</div>
            <div class="koop-text">{{ t('Ki.koopZiel') }}</div>
          </div>
        </div>
      </template>
    </GameComponent>
  </div>
</template>

<script setup lang="ts">
// Spiel gegen die KI der TAC-App, komplett im Browser: Oskars Spielregeln
// aus dem gemeinsamen Kern, seine Spieloberflaeche, unsere KI im Web Worker.
// Der Server ist an der Partie nicht beteiligt.
import GameComponent from '@/components/game/GameComponent.vue'
import { ref, watch, onUnmounted, onMounted } from 'vue'
import Tag from 'primevue/tag'
import { Game } from '@repo/core/game/game'
import { getCards, getPlayerUpdateFromGame } from '@repo/core/game/serverOutput'
import { getAiData } from '@repo/core/bot/simulation/output'
import { projectMoveToGamePlayer } from '@repo/core/bot/normalize/normalize'
import type { GameForPlay, UpdateDataType, MoveTextOrBall } from '@repo/core/types'
import { KiDienst } from '@repo/core/bot/netz/ki_dienst'
import KiWorker from '@repo/core/bot/netz/ki_worker.ts?worker'
import { usePositionStyles } from '@/services/compositionGame/usePositionStyles'
import { useMisc } from '@/services/compositionGame/useMisc'
import { useStatistic } from '@/services/compositionGame/useStatistic'
import { useBalls } from '@/services/compositionGame/useBalls'
import { useDiscardPile } from '@/services/compositionGame/useDiscardPile'
import { type PerformMoveAction, usePerformMove } from '@/services/compositionGame/usePerformMove'
import { useCards } from '@/services/compositionGame/useCards'
import { useInstructions } from '@/services/compositionGame/useInstructions'
import router from '@/router/index'
import { useSettingsStore } from '@/store/settings'
import { useI18n } from 'vue-i18n'
import { KI_STUFEN, KI_STUFEN_DREI, SITZE, type KiModus } from '@/views/kiStufen'

const { t } = useI18n()
/** Zeitgrenze je KI-Zug: auf schnellen Geraeten rechnet sie wie in der App. */
const ZEITGRENZE = 2000
/**
 * Pause nach jedem KI-Zug, damit man ihn mitverfolgen kann. Muss laenger
 * sein als die Kugel-Animation (1,2 s in GameBoard.vue), sonst startet der
 * naechste Teilschritt einer 7 mitten im Flug und die Kugel springt.
 * Oskars Server wartet bei der 7 aus demselben Grund 1,5 s.
 * Ganze Zuege: je nach Einstellung „KI-Tempo"; die Teilschritte einer 7
 * gehoeren zu einem Zug und bleiben knapp.
 */
const PAUSE = { langsam: 3000, normal: 2000, schnell: 1400 } as const
const PAUSE_7 = 1500
const settingsStore = useSettingsStore()
const ICH = 0

const modus: KiModus = (['klassisch', 'drei', 'koop'] as const).find((m) => m === router.currentRoute.value.query.modus) ?? 'klassisch'
const SITZ_ZAHL = SITZE[modus]
const miscState = useMisc(SITZ_ZAHL)
const positionStyles = usePositionStyles(miscState)
// Kooperativ: der Kartenzaehler steht rechts neben dem Brett, wenn dort
// genug Platz ist; sonst am rechten Brettrand.
const koopSeite = ref<HTMLElement | null>(null)
const koopSeiteBreit = ref(false)
const berechnePositionen = positionStyles.recalculatePositionStyles
positionStyles.recalculatePositionStyles = () => {
  berechnePositionen()
  if (modus === 'koop') {
    positionStyles.stylePositionCoop = koopSeiteBreit.value ? 'display: none;' : 'left: 82%; top: 50%; transform: translate(-50%, -50%);'
  }
}
const koopSeiteBeobachter = new ResizeObserver(() => {
  const breit = (koopSeite.value?.clientWidth ?? 0) >= 180
  if (breit === koopSeiteBreit.value) return
  koopSeiteBreit.value = breit
  positionStyles.recalculatePositionStyles()
})
watch(koopSeite, (el) => {
  koopSeiteBeobachter.disconnect()
  if (el != null) koopSeiteBeobachter.observe(el)
})
onUnmounted(() => koopSeiteBeobachter.disconnect())
const statisticState = useStatistic()
const discardPileState = useDiscardPile(miscState.gamePlayer)
const ballsState = useBalls()
const cardsState = useCards(ballsState, miscState)
const performMove = usePerformMove(cardsState, ballsState, miscState, discardPileState)
const instructionsState = useInstructions(miscState, ballsState, cardsState)
const updateData = ref<null | UpdateDataType>(null)
const modalVisible = ref(false)
const modalState = ref('settings')

const stufe = ref<string | null>((router.currentRoute.value.query.stufe as string) ?? null)
/** Testmodus `?auto=1`: die KI spielt auch meinen Sitz (Partie bis zum Ende ohne Klicks). */
const auto = router.currentRoute.value.query.auto === '1'
const ki = new KiDienst(() => new KiWorker(), import.meta.env.BASE_URL + 'netze/')
let game: Game | null = null
let spiel: GameForPlay | null = null
let laeuft = false
let beendet = false

function zeige() {
  if (spiel) updateData.value = getPlayerUpdateFromGame(spiel, ICH)
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Namen am Brett: klassisch heisst der Partner wie die Stufe, die Gegner
 * bekommen eine Nummer; bei 3 gegen 3 die Partner A und B; kooperativ
 * sind alle Mitspieler.
 */
function namen(kurz: string): string[] {
  if (modus === 'koop') return [t('Ki.du'), 'KI 1', 'KI 2', 'KI 3']
  if (modus === 'drei') return [t('Ki.du'), `${kurz} 1`, `${kurz} A`, `${kurz} 2`, `${kurz} B`, `${kurz} 3`]
  return [t('Ki.du'), `${kurz} 1`, kurz, `${kurz} 2`]
}

function neuesSpiel() {
  const kurz = [...KI_STUFEN, ...KI_STUFEN_DREI].find((s) => s.name === stufe.value)?.kurz ?? 'KI'
  beendet = false
  game = new Game(SITZ_ZAHL, 2, true, modus === 'koop')
  spiel = {
    id: 0,
    game,
    colors: ['red', 'blue', 'green', 'yellow', 'orange', 'turquoise'].slice(0, SITZ_ZAHL),
    rematch_open: false,
    substitution: null,
    running: true,
    nPlayers: SITZ_ZAHL,
    nTeams: 2,
    coop: modus === 'koop',
    created: Date.now(),
    lastPlayed: Date.now(),
    publicTournamentId: null,
    privateTournamentId: null,
    players: namen(kurz),
    bots: [null, ...Array.from({ length: SITZ_ZAHL - 1 }, () => 0)],
    playerIDs: Array.from({ length: SITZ_ZAHL }, () => null),
  }
  setTimeout(() => positionStyles.onResize(), 50)
  zeige()
  weiter()
}

/** Wer muss jetzt etwas tun? null = niemand (Partie zu Ende). */
function amZug(g: Game): { sitz: number; zug?: MoveTextOrBall } | null {
  if (g.gameEnded) return null
  if (g.tradeFlag) {
    // Die KI tauscht zuerst; danach wartet die Partie auf meinen Tausch.
    const kiSitz = g.tradedCards.findIndex((c, i) => i !== ICH && c == null && g.cards.players[i].length > 0)
    if (kiSitz >= 0) return { sitz: kiSitz }
    return { sitz: ICH }
  }
  if (g.narrFlag.some(Boolean)) {
    const p = g.narrFlag.findIndex((f, i) => !f && g.cards.players[i].length > 0 && (i !== ICH || auto))
    if (p >= 0) return { sitz: p, zug: [p, 0, 'narr'] }
    return { sitz: ICH }
  }
  const sitz = g.activePlayer
  const k = getCards(g, sitz)
  if ((sitz !== ICH || auto) && k.length > 0 && k.every((c) => c.textAction === 'beenden')) return { sitz, zug: [sitz, 0, 'beenden'] }
  return { sitz }
}

/** Spielt die Zuege der KI, bis ich wieder dran bin. */
async function weiter() {
  if (laeuft || game == null) return
  laeuft = true
  try {
    while (!beendet && game && !game.gameEnded) {
      if (game.cards.players.every((p) => p.length === 0)) {
        game.performAction('dealCards', 0)
        zeige()
        await pause(400)
      }
      game.updateCardsWithMoves()
      const wer = amZug(game)
      if (wer == null || (wer.sitz === ICH && !auto)) break
      let zug = wer.zug
      if (zug == null) {
        const z = await ki.zug(stufe.value ?? 'heuristik', getAiData(game, wer.sitz), { sitz: String(wer.sitz), zeitGrenze: ZEITGRENZE })
        if (beendet || game == null) return
        zug = projectMoveToGamePlayer(game, z, wer.sitz)
      }
      if (!game.checkMove(zug)) {
        console.error('KI-Zug abgelehnt', zug)
        break
      }
      game.performAction(zug, 0)
      if (spiel) spiel.lastPlayed = Date.now()
      zeige()
      const teilschritt = game.cardsWithMoves.some((c) => c.title.includes('-'))
      await pause(zug[2] === 'tauschen' ? 50 : auto ? 60 : teilschritt ? PAUSE_7 : PAUSE[settingsStore.kiTempo])
    }
    if (game?.gameEnded && spiel) {
      spiel.running = false
      zeige()
    }
  } finally {
    laeuft = false
  }
}

/** Mein Zug aus der Oberflaeche: ausfuehren, dann ist die KI dran. */
function spielerZug(aktion: PerformMoveAction) {
  if (game == null || laeuft) return
  const zug = performMove(aktion)
  if (!game.checkMove(zug)) {
    console.error('Zug abgelehnt', zug)
    zeige()
    return
  }
  game.performAction(zug, 0)
  zeige()
  weiter()
}

function schliesse() {
  beendet = true
  router.push({ name: 'KiAuswahl' })
}

onMounted(() => {
  // Ohne Stufe gibt es nichts zu spielen: zur Auswahl.
  if (stufe.value == null) router.replace({ name: 'KiAuswahl' })
  else neuesSpiel()
})

onUnmounted(() => {
  beendet = true
  ki.beende()
})
</script>

<style scoped>
.koop-seite {
  width: 100%;
  display: flex;
  justify-content: center;
}
.koop-zaehler {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 240px;
  padding: 16px;
  text-align: center;
}
.koop-zahl {
  font-size: 56px;
  font-weight: bold;
  line-height: 1.1;
}
.koop-titel {
  font-weight: bold;
}
.koop-text {
  font-size: 0.85em;
  opacity: 0.7;
}
</style>
