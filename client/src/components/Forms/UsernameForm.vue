<template>
  <span :class="['p-float-label', 'floatingTextInput', iconClass]">
    <i
      v-if="nameCheck === null"
      class="pi pi-spin pi-spinner"
      aria-hidden="true"
    />
    <i
      v-if="nameCheck === true"
      class="pi pi-check"
      aria-hidden="true"
    />
    <InputText
      id="SUusername"
      v-model="localUsername"
      type="text"
      name="username"
      style="width: 100%"
      :class="localValid || localUsername === '' ? '' : 'p-invalid'"
    />
    <label for="SUusername">{{ $t('Login.username') }}</label>
    <small class="p-error">{{ usernameErrorLabel }}</small>
  </span>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'

import { ref, computed, watch } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index'
import { i18n } from '@/services/i18n'

const nameCheck = ref<boolean | null>(false)
const nameCheckTimeout = ref(undefined as number | undefined)

const emit = defineEmits<{
  (eventName: 'update:username', username: string): void
  (eventName: 'update:valid', valid: boolean): void
}>()
const props = defineProps<{ username: string; valid: boolean }>()

const localUsername = computed({
  get: () => props.username,
  set: (val: string) => emit('update:username', val),
})

const localValid = computed({
  get: () => props.valid,
  set: (val: boolean) => emit('update:valid', val),
})

watch(
  () => localUsername.value,
  () => {
    clearTimeout(nameCheckTimeout.value)
    if (!validUsername.value) {
      nameCheck.value = false
      localValid.value = false
    } else {
      nameCheck.value = null
      nameCheckTimeout.value = window.setTimeout(() => checkUsername(), 200)
    }
  }
)

async function checkUsername() {
  nameCheck.value = await Service.isUsernameFree(localUsername.value)
  localValid.value = nameCheck.value && validUsername.value
}

const validUsername = computed(() => !(usernameTooShort.value || usernameTooLong.value || usernameWrongCharacters.value))
const usernameTooShort = computed(() => localUsername.value.length < 3)
const usernameTooLong = computed(() => localUsername.value.length > 12)
const usernameWrongCharacters = computed(() => !localUsername.value.match(/^[A-Za-z\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df]+$/))

const usernameErrorLabel = computed(() => {
  if (localUsername.value !== '') {
    if (usernameWrongCharacters.value) {
      return i18n.global.t('Login.SignUp.usernameWrongChar')
    } else if (usernameTooShort.value) {
      return i18n.global.t('Login.SignUp.usernameTooShort')
    } else if (usernameTooLong.value) {
      return i18n.global.t('Login.SignUp.usernameTooLong')
    } else if (nameCheck.value === false) {
      return i18n.global.t('Login.SignUp.usernameNotAvailable')
    }
  }
  return ''
})

const iconClass = computed(() => {
  return nameCheck.value === null || nameCheck.value === true ? 'p-input-icon-right' : ''
})
</script>
