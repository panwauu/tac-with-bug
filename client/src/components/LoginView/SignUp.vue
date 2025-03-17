<template>
  <div>
    <form @submit.prevent="signUp">
      <UsernameForm
        v-model:username="username"
        v-model:valid="validUsername"
        class="inputField"
      />
      <EmailForm
        v-model:email="email"
        v-model:valid="validEmail"
        class="inputField"
      />
      <PasswordForm
        v-model:password="password"
        v-model:valid="validPassword"
        class="inputField"
      />

      <Button
        type="submit"
        :icon="'pi ' + (loading ? 'pi-spin pi-spinner' : 'pi-sign-in')"
        :label="t('Login.SignUp.button')"
        class="signUpButton"
        :disabled="!validUsername || !validEmail || !validPassword || loading"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import UsernameForm from '../Forms/UsernameForm.vue'
import EmailForm from '../Forms/EmailForm.vue'
import PasswordForm from '../Forms/PasswordForm.vue'

import { ref } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { i18n } from '@/services/i18n'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits<{ done: [] }>()

const toast = useToast()

const username = ref('')
const validUsername = ref(false)

const email = ref('')
const validEmail = ref(false)

const password = ref('')
const validPassword = ref(false)

const loading = ref(false)

async function signUp() {
  loading.value = true

  const credentials = {
    username: username.value,
    email: email.value,
    password: password.value,
    locale: String(i18n.global.locale),
  }
  try {
    await Service.signUpUser(credentials)
    toast.add({
      severity: 'success',
      summary: t('Login.SignUp.successMsg'),
      detail: t('Login.SignUp.successMsgDetail'),
      life: 10000,
    })

    username.value = ''
    email.value = ''
    password.value = ''
    emit('done')
  } catch {
    toast.add({
      severity: 'error',
      detail: t('Login.SignUp.errorMsg'),
      summary: t('Login.SignUp.errorMsg'),
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
