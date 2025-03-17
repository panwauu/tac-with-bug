<template>
  <transition name="fade">
    <div
      v-if="!connected"
      class="connectionOverlay"
    >
      <div class="overlayBackground" />
      <template v-if="loading">
        <i
          class="pi pi-spin pi-spinner"
          style="font-size: 2rem"
          aria-hidden="true"
        />
      </template>
      <template v-else-if="reconnecting">
        <h1 class="reconnectionText">{{ t('GameView.socketReconnectingOverlay') }}</h1>
        <ProgressBar
          :value="reconnectionProgress"
          class="reconnectionProgress"
          :showValue="false"
        />
      </template>
      <template v-else>
        <h1 class="reconnectionText">{{ t('GameView.socketDisconnectedOverlay') }}</h1>
        <Button
          :label="t('GameView.refreshPageButton')"
          class="refreshButton"
          @click="router.go(0)"
        />
      </template>
    </div>
  </transition>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

import { ref, onUnmounted, computed } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import { useI18n } from 'vue-i18n'
import router from '@/router'

const { t } = useI18n()
const socket = injectStrict(SocketKey)

const loading = ref(true)
const connected = ref(false)
const reconnecting = ref(false)

const reconnectionAttemptNumber = ref(0)
const reconnectionAttempts = computed(() => socket.io.opts.reconnectionAttempts ?? Infinity)

socket.on('connect', connectHandler)
socket.on('connect_error', connectErrorHandler)
socket.on('disconnect', disconnectHandler)
socket.io.on('reconnect_attempt', reconnectAttemptHandler)
socket.io.on('reconnect_failed', reconnectFailedHandler)

onUnmounted(() => {
  socket.off('connect', connectHandler)
  socket.off('connect_error', connectErrorHandler)
  socket.off('disconnect', disconnectHandler)
  socket.io.off('reconnect_attempt', reconnectAttemptHandler)
  socket.io.off('reconnect_failed', reconnectFailedHandler)
})

function connectHandler() {
  console.log('Socket connected')
  loading.value = false
  connected.value = true
  reconnecting.value = false
}

function connectErrorHandler(error: Error) {
  console.log(`Socket connect error: ${error}`)
  loading.value = false
}

function disconnectHandler(reason: any) {
  loading.value = false
  connected.value = false

  if (reason === 'io server disconnect') {
    console.log('Socket closed by server')
    return
  }

  if (reason === 'io client disconnect') {
    console.log('Socket closed by client')
    return
  }

  console.log('Socket disconnected but will try to reconnect')
  reconnecting.value = true
  reconnectionAttemptNumber.value = 0
}

function reconnectAttemptHandler(attempt: number) {
  console.log(`Reconnect Attempt ${attempt}`)
  reconnecting.value = true
  reconnectionAttemptNumber.value = attempt
}

function reconnectFailedHandler() {
  reconnecting.value = false
}

const reconnectionProgress = computed(() => {
  return (reconnectionAttemptNumber.value / reconnectionAttempts.value) * 100
})

// TBD Visual Update
</script>

<style scoped>
.connectionOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.overlayBackground {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--surface-a);
  opacity: 0.7;
  z-index: 1;
}

.reconnectionText {
  margin: 0 20px;
  z-index: 2;
}

.reconnectionProgress {
  width: 70vw;
  height: 30px;
  z-index: 3;
}

.refreshButton {
  z-index: 3;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
