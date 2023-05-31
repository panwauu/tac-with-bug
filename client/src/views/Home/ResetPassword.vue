<template>
  <div style="width: 100%; max-width: 400px">
    <span :class="['p-float-label', 'floatingTextInput']">
      <InputText
        id="SUusername"
        :model-value="username"
        type="text"
        name="username"
        style="width: 100%"
        :disabled="true"
      />
      <label for="SUusername">{{ $t('Login.username') }}</label>
    </span>
    <PasswordForm
      v-model:valid="valid"
      v-model:password="password"
    />
    <Button
      :label="$t('NewPassword.submitButton')"
      :disabled="!valid || loading"
      :icon="'pi ' + (loading ? 'pi-spin pi-spinner' : 'pi-refresh')"
      type="submit"
      style="margin-top: 30px"
      @click="submitNewPassword"
    />
  </div>
</template>

<script setup lang="ts">
import router from '@/router/index'
import PasswordForm from '@/components/Forms/PasswordForm.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { DefaultService } from '@/generatedClient'
import { i18n } from '@/services/i18n'

const toast = useToast()
const props = defineProps<{ token: string; username: string }>()

const password = ref<string>('')
const valid = ref<boolean>(false)
const loading = ref<boolean>(false)

async function submitNewPassword() {
  loading.value = true

  try {
    await DefaultService.applyPasswordReset({ token: props.token, password: password.value })
    loading.value = false
    toast.add({
      severity: 'success',
      detail: i18n.global.t('NewPassword.passwordResetSuccess-detail'),
      summary: i18n.global.t('NewPassword.passwordResetSuccess-summary'),
      life: 10000,
    })
  } catch (err) {
    loading.value = false
    toast.add({
      severity: 'error',
      detail: i18n.global.t('Toast.GenericError.detail'),
      summary: i18n.global.t('Toast.GenericError.summary'),
      life: 10000,
    })
  }

  return router.push({ name: 'Landing' })
}
</script>
