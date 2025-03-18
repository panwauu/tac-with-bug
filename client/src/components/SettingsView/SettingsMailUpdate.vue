<template>
  <form @submit.prevent="requestMailUpdate()">
    <EmailForm
      v-model:email="email"
      v-model:valid="validEmail"
      style="width: 100%"
    />

    <FloatLabel style="margin-top: 30px">
      <InputText
        id="SUpasswordMail"
        v-model="password"
        type="password"
        name="password"
        style="width: 100%"
      />
      <label for="SUpasswordMail">{{ t('Settings.ChangeMail.password') }}</label>
    </FloatLabel>
    <Button
      type="submit"
      icon="pi pi-refresh"
      :label="t('Settings.ChangeMail.button')"
      style="margin-top: 20px"
      :disabled="!validEmail || password === ''"
    />
  </form>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'

import EmailForm from '../Forms/EmailForm.vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
const toast = useToast()

const emit = defineEmits<{ settingoperationdone: [] }>()

const email = ref('')
const validEmail = ref(false)
const password = ref('')

const requestMailUpdate = async () => {
  try {
    await Service.changeMail({ password: password.value, email: email.value })
    password.value = ''
    email.value = ''
    toast.add({
      severity: 'success',
      summary: t('Settings.ChangeMail.toastSummarySuccess'),
      detail: t('Settings.ChangeMail.successMsg'),
      life: 2000,
    })
    emit('settingoperationdone')
  } catch (err: any) {
    let errorText = ''
    if (err?.body?.message === 'Password is incorrect!') {
      errorText = t('Settings.ChangeMail.errorMsgPwd')
    } else if (err?.body?.message === 'Email not available') {
      errorText = t('Settings.ChangeMail.errorMsgEmail')
    } else {
      errorText = t('Settings.ChangeMail.errorMsgGeneral')
    }

    toast.add({
      severity: 'error',
      summary: t('Settings.ChangeMail.toastSummaryFailure'),
      detail: errorText,
      life: 2000,
    })
  }
}
</script>
