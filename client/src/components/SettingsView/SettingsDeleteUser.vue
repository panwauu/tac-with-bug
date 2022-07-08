<template>
  <div>
    <Button
      class="SettingsButton"
      @click="deleteUser()"
    >
      {{ $t('Settings.DeleteProfile.button') }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

import { DefaultService as Service } from '@/generatedClient/index'

import { i18n } from '@/services/i18n'
import { useToast } from 'primevue/usetoast'
import { logout } from '@/services/useUser'
import { injectStrict, SocketKey } from '@/services/injections'
const toast = useToast()

const emit = defineEmits(['settingoperationdone'])
const socket = injectStrict(SocketKey)

const deleteUser = async () => {
  if (confirm(i18n.global.t('Settings.DeleteProfile.confirmPrompt'))) {
    try {
      await Service.deleteUser()
      toast.add({
        severity: 'success',
        summary: i18n.global.t('Settings.DeleteProfile.successTitle'),
        detail: i18n.global.t('Settings.DeleteProfile.successMsg'),
        life: 2000,
      })
      setTimeout(() => {
        logout(socket)
      }, 2000)
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: i18n.global.t('Settings.DeleteProfile.errorTitle'),
        detail: i18n.global.t('Settings.DeleteProfile.errorMsg'),
        life: 2000,
      })
    }
  }
  emit('settingoperationdone')
}
</script>

<style scoped>
.SettingsButton {
  margin: 5px;
}
</style>
