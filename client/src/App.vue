<template>
  <Toast
    style="max-width: 90vw"
    :base-z-index="2500"
  />
  <ChatWrapper>
    <router-view class="RouterView" />
  </ChatWrapper>
  <ConnectionStatusOverlay />

  <Menubar v-show="false" />
  <Card v-show="false" />
</template>

<script setup lang="ts">
import Toast from 'primevue/toast'
import ChatWrapper from '@/components/Chat/ChatWrapper.vue'
import ConnectionStatusOverlay from '@/components/ConnectionStatusOverlay.vue'

import { watch, provide, onUnmounted } from 'vue'
import { registerSocketToastHandlers } from '@/services/socketToastTournament'
import { useGamesSummary } from '@/services/useGamesSummary'
import { checkVersion } from '@/services/useCheckVersions'
import { GamesSummaryKey, SocketKey, FriendsStateKey, injectStrict } from '@/services/injections'
import { logout } from '@/services/useUser'
import { userFriends } from '@/services/useFriends'
import { DefaultService as Service } from './generatedClient/index.ts'
import { useToast } from 'primevue/usetoast'
import router from './router'
import { initTournamentWinners } from './services/useTournamentWinners'
import { useI18n } from 'vue-i18n'

import Menubar from 'primevue/menubar'
import Card from 'primevue/card'

const { t } = useI18n()
const toast = useToast()

const socket = injectStrict(SocketKey)
const gamesSummary = useGamesSummary(socket)
const friendsState = userFriends(socket)

provide(GamesSummaryKey, gamesSummary)
provide(FriendsStateKey, friendsState)

socket.on('logged_out', async () => {
  toast.add({
    severity: 'warn',
    life: 10000,
    summary: t('Connection.ServerSideLogoutSummary'),
    detail: t('Connection.ServerSideLogoutDetail'),
  })
  await logout(socket)
})

registerSocketToastHandlers(socket)
initTournamentWinners(socket).catch((err) => console.error(err))

checkForEmailActivation()
watch(
  () => {
    return router.currentRoute.value.query
  },
  checkForEmailActivation,
  { deep: true }
)

function checkForEmailActivation() {
  if (router.currentRoute.value.query.activationUserID != null && router.currentRoute.value.query.activationToken != null) {
    const userID = parseInt(router.currentRoute.value.query.activationUserID as string)
    const token = router.currentRoute.value.query.activationToken as string
    activateUser(userID, token)
  }
}

function activateUser(userID: number, token: string) {
  console.log('Activation of user')
  Service.activateUser(userID, token)
    .then(() => {
      toast.add({
        severity: 'success',
        summary: t('Login.SignIn.activationSuccessMsg'),
        detail: t('Login.SignIn.activationSuccessDetails'),
        life: 10000,
      })
      return router.push({ name: 'Landing' })
    })
    .catch(() =>
      toast.add({
        severity: 'error',
        summary: t('Login.SignIn.activationErrorMsg'),
        life: 10000,
      })
    )
}

const interval = setInterval(async () => checkVersion(toast).catch((err) => console.error(err)), 5 * 60 * 1000)
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.RouterView {
  z-index: 0;
}
</style>

<style>
.splitpanes.default-theme .splitpanes__pane {
  background: transparent;
}

.splitpanes__splitter {
  background: var(--p-content-border-color) !important;
}

.default-theme.splitpanes--horizontal > .splitpanes__splitter,
.default-theme .splitpanes--horizontal > .splitpanes__splitter {
  border-top: 1px solid var(--p-content-border-color) !important;
}

.default-theme.splitpanes--vertical > .splitpanes__splitter,
.default-theme .splitpanes--vertical > .splitpanes__splitter {
  border-left: 1px solid var(--p-content-border-color) !important;
}

:not(.splitpanes--dragging) > .splitpanes__pane {
  transition:
    height 0.2s ease-out,
    width 0.2s ease-out !important;
}
</style>

<style lang="scss">
:root {
  --tac-red: #ef3f23;
  --tac-text-color: #002b54;
  --background-ground: var(--p-surface-50);
  --background-contrast: var(--p-content-background);
  --background-contraster: var(--p-surface-100);
  --background-contrastest: var(--p-surface-200);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background-ground: var(--p-surface-950);
    --background-contrast: var(--p-content-background);
    --background-contraster: var(--p-surface-800);
    --background-contrastest: var(--p-surface-700);
  }
}

html {
  padding: 0;
  margin: 0;
  height: 100%;
  width: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  background-color: var(--background-ground);
}

body {
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 600px) {
  .bodyNoscroll {
    height: 100%;
    overflow: hidden;
    bottom: 0;
    left: 0;
    position: fixed;
    right: 0;
    top: 0;
  }
}

#app {
  width: 100%;
  height: 100%;
  text-align: center;
}

.clickable {
  cursor: pointer;
}

.custom-invalid {
  color: var(--p-form-field-invalid-placeholder-color);
  border-color: var(--p-form-field-invalid-border-color);
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--p-primary-color) transparent;
}

*::-webkit-scrollbar {
  width: 12px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: var(--p-primary-color);
  border-radius: 20px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

@font-face {
  font-family: 'tacfontregular';
  src:
    url('./assets/TacFont/tacfont_semibold_1-webfont.woff2') format('woff2'),
    url('./assets/TacFont/tacfont_semibold_1-webfont.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

.tacLetters {
  user-select: none;
}

.tacLetters::first-letter {
  letter-spacing: -0.17em;
}

.twbLetters {
  font-family: 'tacfontregular', Monospace;
  letter-spacing: -0.17em;
  padding-right: 0.17em;
  user-select: none;
}

.twbLetters::first-letter {
  letter-spacing: -0.16em;
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:active,
input:-webkit-autofill:focus {
  filter: none;
  -webkit-text-fill-color: var(--text-color);
  box-shadow: 0 0 0 1000px rgba(15, 63, 81, 0) inset;
  transition: background-color 5000s ease-in-out 0s;
}

.floatingTextInput {
  margin-top: 30px !important;
}
</style>
