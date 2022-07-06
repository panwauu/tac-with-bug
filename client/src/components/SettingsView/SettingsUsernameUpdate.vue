<template>
  <p>{{ $t("Settings.ChangeUsername.disclaimerRememberUsername") }}</p>
  <form @submit.prevent="requestUsernameUpdate()">
    <Username v-model:username="username" v-model:valid="validUsername" style="width: 100%" />

    <span class="p-float-label" style="margin-top: 30px">
      <InputText
        id="setUsernamePassword"
        v-model="password"
        type="password"
        name="password"
        style="width: 100%"
      />
      <label for="setUsernamePassword">
        {{
          $t("Settings.ChangeMail.password")
        }}
      </label>
    </span>
    <Button
      type="submit"
      icon="pi pi-refresh"
      :label="$t('Settings.ChangeUsername.button')"
      style="margin-top: 20px"
      :disabled="!validUsername || password === ''"
    />
  </form>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

import Username from '../Forms/Username.vue';
import { Service } from '@/generatedClient/index';
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { injectStrict, SocketKey } from '@/services/injections';
import { i18n } from '@/services/i18n';
import { logout as logoutUser } from '@/services/useUser';

const toast = useToast();
const socket = injectStrict(SocketKey)

const emit = defineEmits(['settingoperationdone'])

const username = ref('')
const validUsername = ref(false)
const password = ref('')

const requestUsernameUpdate = async () => {
  try {
    await Service.changeUsername({ password: password.value, username: username.value })
    password.value = '';
    username.value = '';
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Settings.ChangeUsername.toastSummarySuccess'),
      detail: i18n.global.t('Settings.ChangeUsername.successMsg'),
      life: 8000,
    });
    emit('settingoperationdone');
    await logoutUser(socket)
  } catch (err: any) {
    let errorText = '';
    if (err?.body?.message === 'Password is incorrect!') {
      errorText = i18n.global.t('Settings.ChangeUsername.errorMsgPwd');
    } else if (err?.body?.message === 'Username not available') {
      errorText = i18n.global.t('Settings.ChangeUsername.errorMsgUsername');
    } else {
      errorText = i18n.global.t('Settings.ChangeUsername.errorMsgGeneral');
    }

    toast.add({
      severity: 'error',
      summary: i18n.global.t('Settings.ChangeUsername.toastSummaryFailure'),
      detail: errorText,
      life: 2000,
    });
  }
}
</script>

<style scoped>
</style>
