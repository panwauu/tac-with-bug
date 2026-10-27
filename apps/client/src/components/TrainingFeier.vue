<template>
  <Dialog
    :visible="offen"
    modal
    :closable="false"
    :show-header="false"
    class="feier"
    @update:visible="(v: boolean) => !v && schliesse()"
  >
    <div
      v-if="f != null"
      class="feier-inhalt"
      :style="{ '--farbe': farbe, '--vorne': f.art === 'stufe' && f.stufe === 4 ? 'var(--p-content-background)' : '#fff' }"
    >
      <svg
        viewBox="-100 -100 200 200"
        class="feier-bild"
        aria-hidden="true"
      >
        <template v-if="f.art === 'stufe'">
          <circle
            v-for="i in 8"
            :key="i"
            class="feier-kugel"
            :style="{ '--winkel': `${(i - 1) * 45}deg`, opacity: [1, 0.7, 0.5, 0.3][(i - 1) % 4] }"
            r="8"
          />
          <g class="feier-haken">
            <circle r="25" />
            <path d="M -12 -2 L -4 8 L 12 -10" />
          </g>
        </template>
        <template v-else>
          <g class="feier-strahlen">
            <line
              v-for="i in 12"
              :key="i"
              :class="['feier-strahl', `feier-strahl-${i % 3}`]"
              :transform="`rotate(${(i - 1) * 30})`"
              x1="20"
              y1="0"
              x2="50"
              y2="0"
            />
          </g>
          <polygon
            class="feier-stern"
            :points="stern"
          />
          <g class="feier-funken">
            <circle
              v-for="i in 8"
              :key="i"
              :transform="`rotate(${(i - 1) * 45}) translate(64 0)`"
              :fill="['#d1342f', '#2f5fa8', '#3f9a3e', '#b99766'][(i - 1) % 4]"
              r="3.5"
            />
          </g>
        </template>
      </svg>
      <h2>{{ f.art === 'alles' ? t('Training.feier.allesTitel') : t('Training.feier.stufeTitel') }}</h2>
      <p>{{ f.art === 'alles' ? t('Training.feier.allesText') : t('Training.feier.stufeText', { stufe: stufenName }) }}</p>
      <Button
        :label="f.art === 'alles' ? t('Training.feier.grossartig') : t('Training.weiter')"
        class="feier-knopf"
        @click="schliesse()"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
// Abschlussfenster des Trainings wie in der App: „Stufe abgeschlossen!“ und
// zum Schluss „Training abgeschlossen!“. Was zu zeigen ist, sammelt markiere().
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'
import { feiern, training, txt } from '@/training'

/** Wartezeit, bevor das Fenster erscheint (in der Übung erst die Erfolgsmeldung zeigen). */
const props = withDefaults(defineProps<{ verzoegerung?: number }>(), { verzoegerung: 0 })

const { t, locale } = useI18n()

// Farben der Stufen wie in der App: Grundlagen grün, Anfänger blau, Fortgeschritten gold, Experte rot, Meister Tinte
const STUFENFARBEN = ['#3f9a3e', '#2f5fa8', '#b99766', '#d1342f', 'var(--p-text-color)']

const offen = ref(false)
const f = computed(() => feiern.value[0])
const farbe = computed(() => (f.value?.art === 'stufe' ? STUFENFARBEN[f.value.stufe] : '#b99766'))
const stufenName = computed(() => {
  const x = f.value
  return x?.art === 'stufe' ? txt(training.stufen.find((s) => s.nr === x.stufe)?.name, locale.value) : ''
})

const stern = Array.from({ length: 10 }, (_, i) => {
  const w = (i / 10) * Math.PI * 2 - Math.PI / 2
  const r = i % 2 === 0 ? 28 : 12.6
  return `${(Math.cos(w) * r).toFixed(1)},${(Math.sin(w) * r).toFixed(1)}`
}).join(' ')

let uhr: ReturnType<typeof setTimeout> | undefined
watch(
  f,
  (neu) => {
    clearTimeout(uhr)
    if (neu == null) offen.value = false
    else if (!offen.value) uhr = setTimeout(() => (offen.value = true), props.verzoegerung)
  },
  { immediate: true }
)
onBeforeUnmount(() => clearTimeout(uhr))

function schliesse() {
  // Nach der Stufe direkt der Abschluss des ganzen Trainings, frisch eingeblendet
  offen.value = false
  setTimeout(() => {
    feiern.value = feiern.value.slice(1)
    if (feiern.value.length > 0) offen.value = true
  }, 250)
}
</script>

<style scoped>
.feier-inhalt {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px 8px 16px;
  max-width: 340px;
}
.feier-inhalt h2 {
  margin: 8px 0 4px 0;
  font-style: italic;
}
.feier-inhalt p {
  margin: 0 0 20px 0;
  opacity: 0.75;
}
.feier-bild {
  width: 200px;
  height: 200px;
}
.feier-knopf,
.feier-knopf:not(:disabled):hover,
.feier-knopf:not(:disabled):active {
  width: 100%;
  background: var(--farbe);
  border-color: var(--farbe);
  color: var(--vorne);
}
.feier-knopf:not(:disabled):hover {
  filter: brightness(1.1);
}
.feier-kugel {
  fill: var(--farbe);
  animation: feier-flug 3s linear infinite;
}
@keyframes feier-flug {
  from {
    transform: rotate(var(--winkel)) translateX(15px) scale(1);
  }
  to {
    transform: rotate(calc(var(--winkel) + 216deg)) translateX(70px) scale(0.62);
  }
}
.feier-haken {
  animation: feier-puls 2.1s ease-in-out infinite;
}
.feier-haken circle {
  fill: var(--farbe);
}
.feier-haken path {
  fill: none;
  stroke: var(--vorne);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@keyframes feier-puls {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
.feier-strahlen {
  animation: feier-drehen 12s linear infinite;
}
.feier-strahl {
  stroke: #b99766;
  stroke-opacity: 0.6;
  stroke-width: 3;
  stroke-linecap: round;
  transform-box: view-box;
  animation: feier-strahl 1.6s ease-in-out infinite alternate;
}
.feier-strahl-1 {
  animation-delay: -0.5s;
}
.feier-strahl-2 {
  animation-delay: -1s;
}
@keyframes feier-strahl {
  from {
    stroke-dasharray: 20 100;
  }
  to {
    stroke-dasharray: 40 100;
  }
}
.feier-stern {
  fill: #b99766;
  stroke: #b8860b;
  stroke-width: 2;
  stroke-linejoin: round;
}
.feier-funken {
  animation: feier-drehen 4s linear infinite;
}
@keyframes feier-drehen {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .feier-kugel,
  .feier-haken,
  .feier-strahlen,
  .feier-strahl,
  .feier-funken {
    animation: none;
  }
}
</style>
