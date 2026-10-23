<template>
  <div class="brett-rahmen">
    <div
      v-if="!bild?.ohneBrett"
      class="brett"
    >
      <BoardImage
        class="brett-bild"
        :n-players="4"
        :turned="false"
        draggable="false"
      />
      <svg
        v-if="bild?.bereich === 'kreis'"
        class="kreis-markierung"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45.3"
        />
      </svg>
      <div
        v-if="bild?.bereich === 'vorfeld'"
        class="element markierung vorfeld-markierung"
        :style="vorfeldStil"
      />
      <div
        v-for="p in bild?.markiere ?? []"
        :key="`m-${p}`"
        class="element markierung"
        :style="stil(p)"
      />
      <template v-if="!bild?.ohneKugeln">
        <BallsImage
          v-for="(pos, j) in positionen"
          :key="`k-${j}`"
          class="element kugel"
          :class="{ schnell: bild?.schnell }"
          :style="stil(pos)"
          :color="FARBEN[Math.floor(j / 4)]"
        />
      </template>

      <!-- Verdeckte Karten der Spieler, wie bei Tac-With-Bug -->
      <template v-if="bild?.haende">
        <div
          v-for="(n, s) in bild.haende"
          :key="`h-${s}`"
        >
          <div
            class="spielername"
            :style="namenStil(s)"
          >
            {{ s === 0 ? t('Training.du') : t(`Training.farbe.${FARBEN[s]}`) }}
          </div>
          <div
            class="hand"
            :style="handStil(s)"
          >
            <template v-if="n > 0 && bild.kannRaus?.includes(s)">
              <div class="raus raus-ol">13</div>
              <div class="raus raus-or">13</div>
              <div class="raus raus-ul">1</div>
              <div class="raus raus-ur">1</div>
            </template>
            <transition-group name="handkarte">
              <CardImage
                v-for="c in n"
                :key="`hk-${s}-${c}`"
                class="handkarte"
                :class="{
                  schraeg: c === n && bild.aktiv === s,
                  rechts: rechtsSitz(s),
                  ueber: c > 1,
                }"
                :style="`${rechtsSitz(s) ? 'right' : 'left'}: ${(c - 1) * 42}%;`"
                :card="c === 1 && bild.kannRaus?.includes(s) ? 'kannraus' : 'card'"
              />
            </transition-group>
          </div>
        </div>
      </template>
      <div
        v-if="bild?.geber != null"
        class="stapel"
        :style="stapelStil(bild.geber)"
      >
        <CardImage
          v-for="i in 4"
          :key="`st-${i}`"
          class="stapelkarte"
          :style="`top: ${-(i - 1) * 4}%`"
          card="backside"
        />
      </div>

      <!-- Ablagestapel: Karten übereinander, leicht gedreht; neue fliegen von der Hand des Spielers ein -->
      <transition-group
        name="ablage"
        tag="div"
        class="ablage"
      >
        <CardImage
          v-for="(k, i) in bild?.karten ?? []"
          :key="`c-${i}-${k}`"
          class="ablagekarte"
          :class="{ liegt: bild?.liegen }"
          :style="ablageStil(i)"
          :card="kartenBild(k)"
        />
      </transition-group>
      <!-- Karten unterwegs (geben, tauschen, ausspielen) -->
      <CardImage
        v-for="f in bild?.flug ?? []"
        :key="`f-${f.id}`"
        class="flugkarte"
        :class="{ gross: f.ort === 'mitte' }"
        :style="flugStil(f.ort)"
        :card="kartenBild(f.karte)"
      />
    </div>

    <div
      v-if="bild?.auslage"
      class="auslage"
      :class="{ 'auf-brett': bild.aufBrett && !bild.ohneBrett }"
    >
      <div
        v-for="(gruppe, gi) in bild.auslage"
        :key="`a-${gi}`"
        class="auslage-gruppe"
      >
        <div
          v-if="gruppe.text"
          class="auslage-titel"
        >
          {{ t(`Training.bild.${gruppe.text}`) }}
        </div>
        <div
          v-if="gruppe.kugeln"
          class="auslage-kugeln"
        >
          <div
            v-for="f in [0, 1, 2, 3]"
            :key="`ak-${f}`"
            class="kugelgruppe"
          >
            <BallsImage
              v-for="i in 4"
              :key="`akk-${f}-${i}`"
              class="auslage-kugel"
              :color="FARBEN[f]"
            />
          </div>
        </div>
        <div class="auslage-karten">
          <div
            v-for="k in gruppe.karten ?? []"
            :key="`ak-${gi}-${k}`"
            class="auslage-karte"
            :class="{ eng: gruppe.anzahl }"
          >
            <CardImage :card="kartenBild(k)" />
            <span v-if="gruppe.anzahl">{{ ANZAHL[k] }}×</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Alle Beschriftungen der Szene übereinander, nur die aktuelle sichtbar: die Kachel behält ihre Höhe -->
    <div
      v-if="texte.length"
      class="beschriftung"
    >
      <span
        v-for="x in texte"
        :key="x"
        :class="{ an: x === bild?.text }"
      >
        {{ t(`Training.bild.${x}`) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Bewegtes Bild zu einer Lektion: Oskars Brett, Kugeln und Karten, eine
// Folge von Bildern in Schleife (training/bilder.ts). Positionen in seiner
// Zählung (Vorfeld 0…15, Ring 16…79, Haus 80…95), Sitz 0 Schwarz. Hände,
// Kartenstapel und Ablage sehen aus wie in seiner Partie.
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BoardImage from '@/components/assets/BoardImage.vue'
import BallsImage from '@/components/assets/BallsImage.vue'
import CardImage from '@/components/assets/CardImage.vue'
import { buildStyles } from '@/js/buildCells'
import { getDeckPositions, getPlayerCards, getPlayerName } from '@/js/getAnnotationStyles'
import { rotatePosition } from '@/js/rotateBoard'
import { cardCount4erTac } from '@repo/core/game/cardUtils'
import { DREHUNG_TRAINING, FARBEN } from '@/training/typen'
import type { Bild, Ort } from '@/training/bilder'

const props = defineProps<{ szene: Bild[] }>()
const { t } = useI18n()

// Wie in den Übungen: Schwarz (Sitz 0) immer unten, Startfeld in der Mitte der unteren Seite.
const zellen = buildStyles(45.3)
function stil(pos: number): Record<string, string> {
  const z = zellen[rotatePosition(pos, DREHUNG_TRAINING, 4)]
  return { top: z.top, left: z.left }
}
/** Ein Kreis um das ganze eigene Vorfeld statt vier einzelner. */
const vorfeldStil = computed(() => {
  const z = [0, 1, 2, 3].map((p) => zellen[rotatePosition(p, DREHUNG_TRAINING, 4)])
  const mittel = (k: 'top' | 'left') => z.reduce((s, x) => s + parseFloat(x[k]), 0) / 4
  return { top: `${mittel('top')}%`, left: `${mittel('left')}%` }
})

/** Sitz → Platz am Brett, wie PlayerInformation (rotateIndex). */
const platz = (s: number) => (s + 4 - DREHUNG_TRAINING) % 4
const HAENDE = getPlayerCards(4, false)
const NAMEN = getPlayerName(4, false)
const STAPEL = getDeckPositions(4, false)
const handStil = (s: number) => HAENDE[platz(s)]
const namenStil = (s: number) => NAMEN[platz(s)]
const stapelStil = (s: number) => STAPEL[platz(s)]
const rechtsSitz = (s: number) => HAENDE[platz(s)].includes('right')

function werte(css: string): Record<string, number> {
  return Object.fromEntries(
    css
      .split(';')
      .map((x) => x.split(':').map((y) => y.trim()))
      .filter(([k, v]) => v?.endsWith('%') && k !== 'transform')
      .map(([k, v]) => [k, parseFloat(v)])
  )
}
/** Mitte der Hand eines Sitzes (Hand 3,6 % breit, 6 % hoch). */
function handMitte(s: number) {
  const w = werte(handStil(s))
  return { left: w.left != null ? w.left + 1.8 : 100 - w.right - 1.8, top: w.top + 3 }
}
function stapelMitte(s: number) {
  const css = stapelStil(s)
  const w = werte(css)
  const links = css.includes('translate(-100%')
  const oben = /translate\([^,]+, -100%\)/.test(css)
  return { left: w.left + (links ? -2 : 2), top: w.top + (oben ? -3.3 : 3.3) }
}
function flugStil(ort: Ort) {
  const m = ort === 'mitte' ? { left: 50, top: 50 } : typeof ort === 'number' ? handMitte(ort) : stapelMitte(ort.stapel)
  return { left: `${m.left}%`, top: `${m.top}%` }
}

/** Drehwinkel der Ablage, bei Oskar zufällig über den ganzen Kreis; hier fest, damit jeder Durchlauf gleich aussieht.
 *  Zwischen -180 und 180°, damit die Karte wie bei ihm auf dem kürzeren Weg dreht. */
const DREHUNG = [37, -148, 118, -59, 74, 166, -101, 13, -19, 95, -132, 150]

/** Karten des vorigen Bildes: was dazukommt, fliegt ein, mehrere nacheinander. */
const vorher = ref<string[]>([])
const neuAb = computed(() => {
  const jetzt = bild.value?.karten ?? []
  let i = 0
  while (i < jetzt.length && i < vorher.value.length && jetzt[i] === vorher.value[i]) i++
  return i
})
/** Wie useDiscardPile: die Karte erscheint groß auf dem ersten Vorfeldfeld des Spielers und gleitet dann gedreht in die Mitte. */
function ablageStil(i: number) {
  const ecke = stil(4 * (bild.value?.von?.[i] ?? 0))
  return {
    '--drehung': `${DREHUNG[i % DREHUNG.length]}deg`,
    '--von-x': `${parseFloat(ecke.left) - 50}cqw`,
    '--von-y': `${parseFloat(ecke.top) - 50}cqw`,
    animationDelay: `${Math.max(0, i - neuAb.value) * 0.6}s`,
  }
}
const ANZAHL = cardCount4erTac as Record<string, number>

const KARTEN: Record<string, string> = {
  '1': 'eins',
  '2': 'zwei',
  '3': 'drei',
  '4': 'vier',
  '5': 'fuenf',
  '6': 'sechs',
  '7': 'sieben',
  '8': 'acht',
  '9': 'neun',
  '10': 'zehn',
  '12': 'zwoelf',
  '13': 'dreizehn',
}
function kartenBild(k: string) {
  return KARTEN[k] ?? k
}

const nr = ref(0)
const bild = computed<Bild | undefined>(() => props.szene[nr.value])
const texte = computed(() => [...new Set(props.szene.flatMap((x) => (x.text ? [x.text] : [])))])
watch(
  bild,
  (_, alt) => {
    vorher.value = alt?.karten ?? []
  },
  { immediate: true }
)
/** Alle 16 Kugeln: was das Bild nicht nennt, steht im eigenen Vorfeld. */
const positionen = computed(() => Array.from({ length: 16 }, (_, j) => bild.value?.pos[j] ?? j))

let uhr: ReturnType<typeof setTimeout> | null = null
function weiter() {
  if (props.szene.length < 2) return
  uhr = setTimeout(() => {
    nr.value = (nr.value + 1) % props.szene.length
    weiter()
  }, bild.value?.dauer ?? 1500)
}
watch(
  () => props.szene,
  () => {
    if (uhr) clearTimeout(uhr)
    nr.value = 0
    weiter()
  },
  { immediate: true }
)
onUnmounted(() => {
  if (uhr) clearTimeout(uhr)
})
</script>

<style scoped>
.brett-rahmen {
  position: relative;
  container-type: inline-size;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}
.brett {
  position: relative;
  width: 100%;
  container-type: inline-size;
}
.brett-bild {
  width: 100%;
  display: block;
}
.element {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 4.065%;
}
.kugel {
  transition: all 0.9s ease-in-out;
  z-index: 2;
}
.kugel.schnell {
  transition: all 0.16s linear;
}
.markierung {
  aspect-ratio: 1;
  border-radius: 50%;
  width: 5.2%;
  background: rgba(255, 214, 0, 0.45);
  box-shadow:
    0 0 0 0.45cqw #ffd400,
    0 0 2cqw 0.6cqw rgba(255, 200, 0, 0.9);
  animation: puls 0.9s ease-in-out infinite alternate;
  z-index: 1;
}
.vorfeld-markierung {
  width: 11.5%;
  background: rgba(255, 214, 0, 0.3);
}
.kreis-markierung {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  animation: puls 0.9s ease-in-out infinite alternate;
}
.kreis-markierung circle {
  fill: none;
  stroke: rgba(255, 212, 0, 0.55);
  stroke-width: 4.6;
  filter: drop-shadow(0 0 1.2px #ffc800);
}
@keyframes puls {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

/* Hände wie PlayerInformation.vue */
.hand {
  position: absolute;
  height: 6%;
  width: 3.6%;
  z-index: 10;
}
.handkarte {
  position: absolute;
  top: 0;
  height: 100%;
  object-fit: contain;
  border-radius: 9%/5.42%;
}
/* Wie bei Oskar: 13 und 1 liegen auf der ersten Karte, die übrigen Karten darüber. */
.handkarte.ueber {
  z-index: 2;
}
.handkarte.schraeg {
  transform-origin: 100% 100%;
  transform: translate(-15%, 0) rotate(20deg);
}
.handkarte.schraeg.rechts {
  transform-origin: 0% 100%;
  transform: translate(13%, 0) rotate(-20deg);
}
.raus {
  color: var(--tac-red, #d00);
  position: absolute;
  z-index: 1;
  font-size: 1.5cqw;
  font-family: 'tacfontregular', Monospace;
}
.raus-ol {
  top: 2%;
  left: 2%;
}
.raus-or {
  top: 2%;
  right: 2%;
}
.raus-ul {
  bottom: 2%;
  left: 12%;
  transform: rotate(180deg);
}
.raus-ur {
  bottom: 2%;
  right: 12%;
  transform: rotate(180deg);
}
.handkarte-enter-active,
.handkarte-leave-active {
  transition: all 0.3s;
}
.handkarte-enter-from,
.handkarte-leave-to {
  opacity: 0;
}
.spielername {
  position: absolute;
  font-weight: bold;
  font-size: 3.5cqw;
  line-height: 1;
  z-index: 10;
}
.stapel {
  position: absolute;
  width: 4%;
  aspect-ratio: 142 / 236;
  z-index: 10;
}
.stapelkarte {
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 9%/5.42%;
}

.ablage {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}
.ablagekarte {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12.6%;
  transform: translate(-50%, -50%) rotate(var(--drehung));
  border-radius: 9%/5.42%;
  box-shadow: 0 0 1.6cqw -0.8cqw black;
  animation: einfliegen 1.1s backwards;
}
/* Oskar: 300 ms beim Spieler stehen, dann 0,8 s ease-in-out in die Mitte. Beide Enden mit gleichen
   Funktionen, sonst zeichnet der Browser einen anderen Weg und die Karte springt am Ende. */
@keyframes einfliegen {
  0%,
  27% {
    transform: translate(-50%, -50%) translate(var(--von-x), var(--von-y)) rotate(0deg);
    animation-timing-function: ease-in-out;
  }
  100% {
    transform: translate(-50%, -50%) translate(0, 0) rotate(var(--drehung));
  }
}
.ablagekarte.liegt {
  animation: none;
}
.ablage-leave-active {
  transition: opacity 0.3s;
}
.ablage-leave-to {
  opacity: 0;
}
.flugkarte {
  position: absolute;
  width: 3.6%;
  transform: translate(-50%, -50%);
  border-radius: 9%/5.42%;
  box-shadow: 0 0.3cqw 1cqw rgba(0, 0, 0, 0.35);
  transition: all 0.55s ease-in-out;
  z-index: 20;
}
.flugkarte.gross {
  width: 12.6%;
}

.auslage {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}
.auslage.auf-brett {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 1;
  margin: 0;
  padding: 0 19%;
  box-sizing: border-box;
  justify-content: center;
  gap: 2%;
  z-index: 5;
}
.auf-brett .auslage-titel {
  font-size: 3.6cqw;
  margin-bottom: 1cqw;
  color: #3b2a14;
  text-shadow: 0 0 4px rgba(255, 240, 210, 0.9);
}
.auf-brett .auslage-kugeln {
  gap: 5%;
}
.auf-brett .kugelgruppe {
  width: 11%;
  grid-template-columns: repeat(2, 1fr);
  gap: 4%;
}
.auf-brett .auslage-kugel {
  width: 100%;
}
.auf-brett .auslage-karten {
  gap: 1.5% 2%;
}
.auf-brett .auslage-karte.eng {
  width: 14%;
  min-width: 0;
  max-width: none;
  font-size: 2.8cqw;
  font-weight: bold;
  color: #3b2a14;
}
.auslage-titel {
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
}
.auslage-kugeln {
  display: flex;
  justify-content: center;
  gap: 14px;
}
.kugelgruppe {
  display: grid;
  grid-template-columns: repeat(2, 22px);
  gap: 2px;
}
.auslage-kugel {
  width: 22px;
}
.auslage-karten {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}
.auslage-karte {
  width: 13%;
  min-width: 48px;
  max-width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.85em;
}
.auslage-karte.eng {
  width: 10%;
  min-width: 30px;
  max-width: 54px;
}
.auslage-karte img {
  width: 100%;
  border-radius: 9%/5.42%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.beschriftung {
  display: grid;
  text-align: center;
  font-weight: bold;
  margin-top: 6px;
  min-height: 1.4em;
}
.beschriftung > span {
  grid-area: 1 / 1;
  visibility: hidden;
}
.beschriftung > span.an {
  visibility: visible;
}
</style>
