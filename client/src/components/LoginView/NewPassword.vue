<template>
  <div>
    <form @submit.prevent="executeNewPassword">
      <span class="p-float-label floatingTextInput usernameEmailInput loginInputElement">
        <InputText
          id="NPusername"
          v-model="usernameOrEmail"
          type="text"
          name="username"
          class="inputElement"
        />
        <label for="NPusername">{{ $t("Login.emailOrUsername") }}</label>
      </span>
      <Button
        type="submit"
        class="loginInputElement"
        :icon="'pi ' + (loading ? 'pi-spin pi-spinner' : 'pi-question')"
        :label="$t('Login.RequestNewPassword.button')"
        :disabled="usernameOrEmail === '' || loading === true"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

import { ref } from 'vue';
import * as EmailValidator from 'email-validator';
import { DefaultService as Service } from '@/generatedClient/index';
import { i18n } from '@/services/i18n';
import { useToast } from 'primevue/usetoast';

const toast = useToast()
const usernameOrEmail = ref('')
const loading = ref(false)

const emit = defineEmits<{ (eventName: 'done'): void }>()

async function executeNewPassword() {
  loading.value = true;

  let data: { username: string } | { email: string } = { username: usernameOrEmail.value };
  if (EmailValidator.validate(usernameOrEmail.value)) {
    data = { email: usernameOrEmail.value };
  }

  try {
    await Service.requestNewPassword(data)

    toast.add({
      severity: 'success',
      summary: i18n.global.t('Login.RequestNewPassword.successMsg'),
      life: 5000,
    })
    usernameOrEmail.value = '';
    loading.value = false;
    emit('done')
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Login.RequestNewPassword.errorMsg'),
      life: 5000,
    })
  }
  loading.value = false;
}
</script>

<style scoped>
.usernameEmailInput {
  width: 100%;
  margin-bottom: 30px;
}

.inputElement {
  width: 100%;
}
</style>
