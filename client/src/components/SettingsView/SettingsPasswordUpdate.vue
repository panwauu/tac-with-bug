<template>
  <form @submit.prevent="requestPasswordUpdate()">
    <div>
      <FloatLabel style="margin-top: 30px">
        <InputText
          id="changePWpassword"
          v-model="password"
          type="password"
          name="password"
          style="width: 100%"
        />
        <label for="changePWpassword">{{ t('Settings.ChangePassword.currentPassword') }}</label>
      </FloatLabel>
    </div>

    <PasswordForm
      v-model:password="newPassword"
      v-model:valid="validNewPassword"
      style="width: 100%"
    />

    <Button
      type="submit"
      icon="pi pi-refresh"
      :label="t('Settings.ChangePassword.button')"
      style="margin-top: 20px"
      :disabled="!validNewPassword || password === ''"
    />
  </form>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'

import PasswordForm from '../Forms/PasswordForm.vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
const toast = useToast()

const emit = defineEmits<{ settingoperationdone: [] }>()

const password = ref('')
const newPassword = ref('')
const validNewPassword = ref(false)

const requestPasswordUpdate = async () => {
  try {
    await Service.changePassword({ password: newPassword.value, password_old: password.value })

    password.value = ''
    newPassword.value = ''
    toast.add({
      severity: 'success',
      summary: t('Settings.ChangePassword.toastSummarySuccess'),
      detail: t('Settings.ChangePassword.successMsg'),
      life: 2000,
    })
    emit('settingoperationdone')
  } catch (err: any) {
    let errorText = ''
    if (!err?.body?.message) {
      errorText = t('Settings.ChangePassword.errorMsgGeneral')
    } else {
      errorText = t('Settings.ChangePassword.errorMsgPwd')
    }

    toast.add({
      severity: 'error',
      summary: t('Settings.ChangePassword.toastSummaryFailure'),
      detail: errorText,
      life: 2000,
    })
  }
}
</script>
