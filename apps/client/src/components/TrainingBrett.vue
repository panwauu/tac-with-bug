<template>
  <div class="brett-rahmen">
    <div class="brett">
      <BoardImage
        class="brett-bild"
        :n-players="4"
        :turned="false"
        draggable="false"
      />
      <div
        v-for="p in bild?.markiere ?? []"
        :key="`m-${p}`"
        class="element markierung"
        :style="stil(p)"
      />
      <BallsImage
        v-for="(pos, j) in positionen"
        :key="`k-${j}`"
        class="element kugel"
        :class="{ schnell: bild?.schnell }"
        :style="stil(pos)"
        :color="FARBEN[Math.floor(j / 4)]"
      />
      <div
        v-if="bild?.karten?.length"
        class="mitte"
      >
        <CardImage
          v-for="(k, i) in bild.karten"
          :key="`c-${i}-${k}`"
          class="karte"
          :card="kartenBild(k)"
        />
      </div>
    </div>
    <div
      v-if="bild?.text"
      class="beschriftung"
    >
      {{ t(`Training.bild.${bild.text}`) }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Bewegtes Bild zu einer Lektion: Oskars Brett, Kugeln und Karten, eine
// Folge von Bildern in Schleife (training/bilder.ts). Positionen in seiner
// Zählung (Vorfeld 0…15, Ring 16…79, Haus 80…95), Sitz 0 Schwarz.
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BoardImage from '@/components/assets/BoardImage.vue'
import BallsImage from '@/components/assets/BallsImage.vue'
import CardImage from '@/components/assets/CardImage.vue'
import { buildStyles } from '@/js/buildCells'
import { getNRotation, rotatePosition } from '@/js/rotateBoard'
import { useSettingsStore } from '@/store/settings'
import { FARBEN } from '@/training/typen'
import type { Bild } from '@/training/bilder'

const props = defineProps<{ szene: Bild[] }>()
const { t } = useI18n()
const settingsStore = useSettingsStore()

// Dieselbe Drehung wie in der Partie: Schwarz (Sitz 0) sitzt, wo man selbst sitzt.
const zellen = buildStyles(45.3)
const drehung = computed(() => getNRotation(settingsStore.defaultPositions, 0, 4))
function stil(pos: number): Record<string, string> {
  const z = zellen[rotatePosition(pos, drehung.value, 4)]
  return { top: z.top, left: z.left }
}

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
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}
.brett {
  position: relative;
  width: 100%;
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
  width: 6%;
  box-shadow: 0 0 0 3px #f2b705;
  animation: puls 1s ease-in-out infinite alternate;
  z-index: 1;
}
@keyframes puls {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}
.mitte {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 2%;
  width: 46%;
  justify-content: center;
  z-index: 3;
}
.karte {
  flex: 1 1 0;
  min-width: 0;
  max-width: 30%;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.beschriftung {
  text-align: center;
  font-weight: bold;
  margin-top: 6px;
  min-height: 1.4em;
}
</style>
