<template>
  <div class="floatingTextInput">
    <InputGroup>
      <FloatLabel>
        <InputText
          id="SUusername"
          v-model="localUsername"
          type="text"
          name="username"
          :invalid="!localValid && localUsername != ''"
        />
        <label for="SUusername">{{ t('Login.username') }}</label>
      </FloatLabel>
      <InputGroupAddon v-if="nameCheck === null">
        <i
          class="pi pi-spin pi-spinner"
          aria-hidden="true"
        />
      </InputGroupAddon>
      <InputGroupAddon v-else-if="nameCheck === true">
        <i
          class="pi pi-check"
          aria-hidden="true"
        />
      </InputGroupAddon>
      <InputGroupAddon v-else>
        <i
          class="pi pi-times"
          aria-hidden="true"
        />
      </InputGroupAddon>
    </InputGroup>
    <small class="custom-invalid">{{ usernameErrorLabel }}</small>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'

import { ref, computed, watch } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'

const { t } = useI18n()
const nameCheck = ref<boolean | null>(false)
const nameCheckTimeout = ref(undefined as number | undefined)

const emit = defineEmits<{
  'update:username': [username: string]
  'update:valid': [valid: boolean]
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
      return t('Login.SignUp.usernameWrongChar')
    } else if (usernameTooShort.value) {
      return t('Login.SignUp.usernameTooShort')
    } else if (usernameTooLong.value) {
      return t('Login.SignUp.usernameTooLong')
    } else if (nameCheck.value === false) {
      return t('Login.SignUp.usernameNotAvailable')
    }
  }
  return ''
})
</script>
