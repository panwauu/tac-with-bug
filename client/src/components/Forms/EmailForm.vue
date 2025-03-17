<template>
  <span :class="['p-float-label', 'floatingTextInput', iconClass]">
    <i
      v-if="emailCheck === null"
      class="pi pi-spin pi-spinner"
      aria-hidden="true"
    />
    <i
      v-if="emailCheck === true"
      class="pi pi-check"
      aria-hidden="true"
    />
    <InputText
      id="SUemail"
      v-model="localEmail"
      type="text"
      name="email"
      style="width: 100%"
      :class="localValid || localEmail === '' ? '' : 'p-invalid'"
    />
    <label for="SUemail">{{ t('Login.email') }}</label>
    <small class="p-error">{{ emailErrorLabel }}</small>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import InputText from 'primevue/inputtext'

import { ref, computed, watch } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index'
import * as EmailValidator from 'email-validator'

const emailCheck = ref<boolean | null>(false)
const emailCheckTimeout = ref(undefined as number | undefined)

const emit = defineEmits<{
  'update:email': [email: string]
  'update:valid': [valid: boolean]
}>()
const props = defineProps<{ email: string; valid: boolean }>()

const localEmail = computed({
  get: () => props.email,
  set: (val: string) => emit('update:email', val),
})

const localValid = computed({
  get: () => props.valid,
  set: (val: boolean) => emit('update:valid', val),
})

watch(
  () => localEmail.value,
  () => {
    clearTimeout(emailCheckTimeout.value)
    if (!validMail.value) {
      emailCheck.value = false
      localValid.value = false
    } else {
      emailCheck.value = null
      emailCheckTimeout.value = window.setTimeout(() => checkEmail(), 200)
    }
  }
)

async function checkEmail() {
  emailCheck.value = await Service.isEmailFree(localEmail.value)
  localValid.value = emailCheck.value && validMail.value
}

const validMail = computed(() => EmailValidator.validate(localEmail.value))

const emailErrorLabel = computed(() => {
  if (localEmail.value !== '') {
    if (!validMail.value) {
      return t('Login.SignUp.emailInvalid')
    } else if (emailCheck.value === false) {
      return t('Login.SignUp.emailNotAvailable')
    }
  }
  return ''
})

const iconClass = computed(() => {
  return emailCheck.value === null || emailCheck.value === true ? 'p-input-icon-right' : ''
})
</script>
