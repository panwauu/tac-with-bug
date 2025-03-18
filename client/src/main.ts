console.log(`Version: ${import.meta.env.PACKAGE_VERSION}`)

import { user, logout } from '@/services/useUser'
const { fetch: originalFetch } = window

window.fetch = async (...args) => {
  const resource = args[0]
  let config = args[1]

  if (user.token != null) {
    if (config == null) {
      config = { headers: { Authorization: `Bearer ${user.token}` } }
    } else if (config.headers == null) {
      config.headers = { Authorization: `Bearer ${user.token}` }
    } else if (Array.isArray(config.headers)) {
      if (config.headers.every((h) => h[0] !== 'Authorization')) config.headers.push(['Authorization', `Bearer ${user.token}`])
    } else if (config.headers instanceof Headers) {
      if (config.headers.get('Authorization') == null) config.headers.set('Authorization', `Bearer ${user.token}`)
    } else {
      if (config.headers['Authorization'] == null) config.headers['Authorization'] = `Bearer ${user.token}`
    }
  }

  const response = await originalFetch(resource, config)
  if (response.status === 401) logout(socket)

  return response
}

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

import 'primeicons/primeicons.css'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import BadgeDirective from 'primevue/badgedirective'
import Tooltip from 'primevue/tooltip'
import { regsiterGeneralSocket } from './services/registerSockets'
import { SocketKey } from './services/injections'
import { MyPreset } from './services/preset'

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

app.use(PrimeVue, { theme: { preset: MyPreset } })
app.use(ToastService)

app.directive('badge', BadgeDirective)
app.directive('tooltip', Tooltip)

app.mount('#app')
