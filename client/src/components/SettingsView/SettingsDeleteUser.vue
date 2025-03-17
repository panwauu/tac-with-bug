<template>
  <div>
    <Button
      class="SettingsButton"
      @click="deleteUser()"
    >
      {{ t('Settings.DeleteProfile.button') }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'

import { DefaultService as Service } from '@/generatedClient/index.ts'

import { useToast } from 'primevue/usetoast'
import { logout } from '@/services/useUser'
import { injectStrict, SocketKey } from '@/services/injections'
const toast = useToast()

const emit = defineEmits<{ settingoperationdone: [] }>()
const socket = injectStrict(SocketKey)

const deleteUser = async () => {
  if (confirm(t('Settings.DeleteProfile.confirmPrompt'))) {
    try {
      await Service.deleteUser()
      toast.add({
        severity: 'success',
        summary: t('Settings.DeleteProfile.successTitle'),
        detail: t('Settings.DeleteProfile.successMsg'),
        life: 2000,
      })
      setTimeout(() => {
        logout(socket)
      }, 2000)
    } catch (err) {
      console.error(err)
      toast.add({
        severity: 'error',
        summary: t('Settings.DeleteProfile.errorTitle'),
        detail: t('Settings.DeleteProfile.errorMsg'),
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
