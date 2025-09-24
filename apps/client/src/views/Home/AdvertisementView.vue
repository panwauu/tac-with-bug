<template>
  <div
    ref="advertPageRef"
    class="advertPage"
    :class="{ advertPagePortrait: showPortrait }"
  >
    <div style="width: 100%; max-width: 600px; border-radius: 10px; margin: 0 auto; position: relative; overflow: hidden">
      <img
        style="width: 100%; max-width: 600px; border-radius: 10px"
        src="@/assets/gameexample.png"
      />
      <GameSimulation style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%" />
    </div>
    <div style="display: flex; justify-content: center">
      <div style="display: flex; flex-direction: column; align-items: center; padding: 10px; flex: 0 1 600px; max-width: 100%">
        <TwbLogo style="width: 250px" />
        <p>
          {{ t(`Advertisement.description1`) }}
          <a
            class="tacLogo"
            href="https://shop.spiel-tac.de/"
            target="_blank"
            rel="noopener noreferrer"
          >
            TAC
          </a>
          {{ t(`Advertisement.description2`) }}
        </p>
        <FunFactsCarousel />
        <div style="display: flex; justify-content: space-around; width: 100%; flex-wrap: wrap">
          <Button
            class="advertButton"
            :label="t('Advertisement.tutorialButton')"
            icon="pi pi-question-circle"
            @click="router.push({ name: 'TutorialOverview' })"
          />
          <Button
            class="advertButton"
            :label="t('Advertisement.gamesButton')"
            icon="pi pi-table"
            @click="router.push({ name: 'Landing' })"
          />
          <Button
            class="advertButton"
            :label="t('Advertisement.signUpButton')"
            :disabled="isLoggedIn"
            icon="pi pi-sign-in"
            @click="clickNewAccount"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TwbLogo from '../../components/icons/TwbLogo.vue'
import Button from 'primevue/button'
import { ref } from 'vue'
import { isLoggedIn } from '@/services/useUser'
import { useResizeObserver } from '@vueuse/core'
import FunFactsCarousel from '@/components/FunFactsCarousel.vue'
import router from '@/router'
import { useI18n } from 'vue-i18n'
import GameSimulation from '@/components/GameSimulation.vue'

const { t } = useI18n()

async function clickNewAccount() {
  await new Promise((resolve) => setTimeout(() => resolve(null), 100))
  const element = document.getElementById('topElementLoginButton')
  if (element == null) {
    console.error('Login Button not found')
    return
  }
  element.click()
}

const showPortrait = ref(false)
const advertPageRef = ref<HTMLDivElement | null>(null)
useResizeObserver(advertPageRef, (entries) => {
  const boundingBox = entries[0].target.getClientRects()[0]
  const width = entries[0].contentRect.width
  const height = window.innerHeight - boundingBox.y
  if (entries[0].contentRect.width < 800) {
    showPortrait.value = true
    return
  }
  if (width / height < 1.5) {
    showPortrait.value = true
    return
  }
  showPortrait.value = false
})
</script>

<style scoped>
.tacLogo {
  font-family: 'tacfontregular', Monospace;
}

.advertPage {
  width: 100%;
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-template-areas: 'a b';
  grid-gap: 20px;
}

.advertPagePortrait {
  grid-template-areas: 'a' 'b';
}

.advertButton {
  margin: 10px;
}
</style>
