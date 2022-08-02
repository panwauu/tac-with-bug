import { DefaultService } from '@/generatedClient'
import { ToastServiceMethods } from 'primevue/toastservice'
import { onUnmounted } from 'vue'
import { i18n } from './i18n'

export function useCheckVersion(toast: ToastServiceMethods) {
  async function checkVersion() {
    const serverVersion = await DefaultService.getServerVersion()
    if (import.meta.env.PACKAGE_VERSION !== serverVersion) {
      console.log(`Version mismatch: Server v${serverVersion} <-> Client v${import.meta.env.PACKAGE_VERSION}`)
      toast.add({
        severity: 'warn',
        life: 20000,
        summary: i18n.global.t('Toast.VersionMismatch.summary'),
        detail: i18n.global.t('Toast.VersionMismatch.detail'),
      })
    }
  }

  let interval: number

  onUnmounted(() => {
    window.clearInterval(interval)
  })

  function start() {
    window.clearInterval(interval)
    checkVersion()
    interval = window.setInterval(() => {
      checkVersion()
    }, 5 * 60 * 1000)
  }

  function stop() {
    window.clearInterval(interval)
  }

  return { start, stop }
}
