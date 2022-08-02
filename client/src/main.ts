console.log(`Version: ${import.meta.env.PACKAGE_VERSION}`)

import './services/socket'

if ('wakeLock' in navigator) {
  console.log('Screen Wake Lock API is supported and will be used 🎉')

  let wakeLock: any = null

  const requestWakeLock = async () => {
    try {
      wakeLock = await (navigator as any).wakeLock.request()
      wakeLock.addEventListener('release', () => {
        console.log('Screen Wake Lock was released')
      })
      console.log('Screen Wakelock aquired')
    } catch (err) {
      console.error(err)
    }
  }

  requestWakeLock()

  const handleVisibilityChange = async () => {
    if (wakeLock != null && document.visibilityState === 'visible') {
      await requestWakeLock()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
} else {
  console.log('Screen Wake Lock API not available')
}

import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import { createPinia } from 'pinia'
const pinia = createPinia()
import { i18n } from '@/services/i18n'

import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import BadgeDirective from 'primevue/badgedirective'
import Tooltip from 'primevue/tooltip'
import { regsiterGeneralSocket } from './services/registerSockets'
import { SocketKey } from './services/injections'

const app = createApp(App)
export const socket = regsiterGeneralSocket()
app.provide(SocketKey, socket)

app.use(router)
pinia.use(({ store }) => {
  store.$state.socket = socket
  store.socket = socket
})
app.use(pinia)
app.use(i18n)

app.use(PrimeVue)
app.use(ToastService)

app.directive('badge', BadgeDirective)
app.directive('tooltip', Tooltip)

app.mount('#app')
