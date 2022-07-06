<template>
  <form @submit.prevent="requestPasswordUpdate()">
    <div>
      <span class="p-float-label" style="margin-top: 30px">
        <InputText
          id="changePWpassword"
          v-model="password"
          type="password"
          name="password"
          style="width: 100%"
        />
        <label for="changePWpassword">{{ $t('Settings.ChangePassword.currentPassword') }}</label>
      </span>
    </div>

    <Password v-model:password="newPassword" v-model:valid="validNewPassword" style="width: 100%" />

    <Button
      type="submit"
      icon="pi pi-refresh"
      :label="$t('Settings.ChangePassword.button')"
      style="margin-top: 20px"
      :disabled="!validNewPassword || password === ''"
    />
  </form>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

import Password from '../Forms/Password.vue';
import { Service } from '@/generatedClient/index';
import { ref } from 'vue';
import { i18n } from '@/services/i18n';
import { useToast } from 'primevue/usetoast';
const toast = useToast()

const emit = defineEmits(['settingoperationdone'])

const password = ref('')
const newPassword = ref('')
const validNewPassword = ref(false)

const requestPasswordUpdate = async () => {
  try {
    await Service.changePassword({ password: newPassword.value, password_old: password.value })

    password.value = '';
    newPassword.value = '';
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Settings.ChangePassword.toastSummarySuccess'),
      detail: i18n.global.t('Settings.ChangePassword.successMsg'),
      life: 2000,
    });
    emit('settingoperationdone');
  } catch (err: any) {
    let errorText = '';
    if (!err?.body?.message) {
      errorText = i18n.global.t('Settings.ChangePassword.errorMsgGeneral');
    } else {
      errorText = i18n.global.t('Settings.ChangePassword.errorMsgPwd');
    }

    toast.add({
      severity: 'error',
      summary: i18n.global.t('Settings.ChangePassword.toastSummaryFailure'),
      detail: errorText,
      life: 2000,
    });
  }
}
</script>

<style scoped>
</style>
