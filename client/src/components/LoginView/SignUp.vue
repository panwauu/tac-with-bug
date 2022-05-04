<template>
  <div>
    <form @submit.prevent="signUp">
      <Username v-model:username="username" v-model:valid="validUsername" class="inputField" />
      <Email v-model:email="email" v-model:valid="validEmail" class="inputField" />
      <Password v-model:password="password" v-model:valid="validPassword" class="inputField" />

      <Button
        type="submit"
        :icon="'pi ' + (loading ? 'pi-spin pi-spinner' : 'pi-sign-in')"
        :label="$t('Login.SignUp.button')"
        class="signUpButton"
        :disabled="
          !validUsername ||
            !validEmail ||
            !validPassword ||
            loading
        "
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Username from '../Forms/Username.vue';
import Email from '../Forms/Email.vue';
import Password from '../Forms/Password.vue';

import { ref } from 'vue';
import { Service } from '@/generatedClient/index';
import { i18n } from '@/services/i18n';
import { useToast } from 'primevue/usetoast';

const emit = defineEmits<{ (eventName: 'done'): void }>()

const toast = useToast();

let username = ref('')
let validUsername = ref(false)

let email = ref('')
let validEmail = ref(false)

let password = ref('')
let validPassword = ref(false)

let loading = ref(false)

async function signUp() {
  loading.value = true;

  const credentials = {
    username: username.value,
    email: email.value,
    password: password.value,
    locale: String(i18n.global.locale),
  };
  try {
    await Service.signUpUser(credentials)
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Login.SignUp.successMsg'),
      detail: i18n.global.t('Login.SignUp.successMsgDetail'),
      life: 10000,
    })

    username.value = ''
    email.value = ''
    password.value = ''
    emit('done')
  } catch {
    toast.add({
      severity: 'error',
      detail: i18n.global.t('Login.SignUp.errorMsg'),
      summary: i18n.global.t('Login.SignUp.errorMsg'),
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.inputField {
  width: 100%;
}
.signUpButton {
  margin-top: 30px;
}
</style>