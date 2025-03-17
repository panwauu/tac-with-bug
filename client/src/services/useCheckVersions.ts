import { DefaultService } from '@/generatedClient/index.ts'
import type { ToastServiceMethods } from 'primevue/toastservice'
import { i18n } from './i18n'

export async function checkVersion(toast: ToastServiceMethods) {
  console.log('Check versions of server and client')
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
