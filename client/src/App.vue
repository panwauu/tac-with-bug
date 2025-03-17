<template>
  <Toast
    style="max-width: 90vw"
    :base-z-index="2500"
  />
  <ChatWrapper>
    <router-view class="RouterView" />
  </ChatWrapper>
  <ConnectionStatusOverlay />
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
  background: var(--surface-d) !important;
}

.default-theme.splitpanes--horizontal > .splitpanes__splitter,
.default-theme .splitpanes--horizontal > .splitpanes__splitter {
  border-top: 1px solid var(--surface-d) !important;
}

.default-theme.splitpanes--vertical > .splitpanes__splitter,
.default-theme .splitpanes--vertical > .splitpanes__splitter {
  border-left: 1px solid var(--surface-d) !important;
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
}

html {
  padding: 0;
  margin: 0;
  height: 100%;
  width: 100%;
  background-color: var(--surface-b);
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
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: var(--text-color);
}

.clickable {
  cursor: pointer;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--primary-color) transparent;
}

*::-webkit-scrollbar {
  width: 12px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: var(--primary-color);
  border-radius: 20px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

@import url('../node_modules/primevue/resources/themes/saga-blue/theme.css') (prefers-color-scheme: light);
@import url('../node_modules/primevue/resources/themes/arya-blue/theme.css') (prefers-color-scheme: dark);

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
