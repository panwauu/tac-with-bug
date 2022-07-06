<template>
  <form @submit.prevent="requestMailUpdate()">
    <EmailForm v-model:email="email" v-model:valid="validEmail" style="width: 100%" />

    <span class="p-float-label" style="margin-top: 30px">
      <InputText
        id="SUpasswordMail"
        v-model="password"
        type="password"
        name="password"
        style="width: 100%"
      />
      <label for="SUpasswordMail">{{ $t("Settings.ChangeMail.password") }}</label>
    </span>
    <Button
      type="submit"
      icon="pi pi-refresh"
      :label="$t('Settings.ChangeMail.button')"
      style="margin-top: 20px"
      :disabled="!validEmail || password === ''"
    />
  </form>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

import EmailForm from '../Forms/EmailForm.vue';
import { Service } from '@/generatedClient/index';
import { ref } from 'vue';
import { i18n } from '@/services/i18n';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

const emit = defineEmits(['settingoperationdone'])

const email = ref('')
const validEmail = ref(false)
const password = ref('')

const requestMailUpdate = async () => {
  try {
    await Service.changeMail({ password: password.value, email: email.value })
    password.value = '';
    email.value = '';
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Settings.ChangeMail.toastSummarySuccess'),
      detail: i18n.global.t('Settings.ChangeMail.successMsg'),
      life: 2000,
    });
    emit('settingoperationdone');
  } catch (err: any) {
    let errorText = '';
    if (err?.body?.message === 'Password is incorrect!') {
      errorText = i18n.global.t('Settings.ChangeMail.errorMsgPwd');
    } else if (err?.body?.message === 'Email not available') {
      errorText = i18n.global.t('Settings.ChangeMail.errorMsgEmail');
    } else {
      errorText = i18n.global.t('Settings.ChangeMail.errorMsgGeneral');
    }

    toast.add({
      severity: 'error',
      summary: i18n.global.t('Settings.ChangeMail.toastSummaryFailure'),
      detail: errorText,
      life: 2000,
    });
  }
}
</script>

<style scoped>
</style>
