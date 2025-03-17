<template>
  <div>
    <span class="p-float-label floatingTextInput">
      <PasswordPrimevue
        id="SUpassword"
        v-model="localPassword"
        type="password"
        name="password"
        style="width: 100%"
        :promptLabel="t('Login.SignUp.passwordChoose')"
        :weakLabel="t('Login.SignUp.passwordWeak')"
        :mediumLabel="t('Login.SignUp.passwordMedium')"
        :strongLabel="t('Login.SignUp.passwordStrong')"
        :class="validPassword || password === '' ? '' : 'p-invalid'"
      >
        <template #footer>
          <Divider />
          <ul style="line-height: 1.5">
            <li :class="passwordTooShort ? 'p-error' : ''">{{ t('Login.SignUp.passwordMinLetters') }}</li>
            <li :class="passwordTooLong ? 'p-error' : ''">{{ t('Login.SignUp.passwordMaxLetters') }}</li>
          </ul>
        </template>
      </PasswordPrimevue>
      <label for="SUpassword">{{ t('Login.password') }}</label>
    </span>

    <span class="p-float-label floatingTextInput">
      <InputText
        id="SUpasswordRepeat"
        v-model="passwordRepeat"
        type="password"
        name="password"
        style="width: 100%"
        :class="validPasswordRepeat || password === '' ? '' : 'p-invalid'"
      />
      <label for="SUpasswordRepeat">{{ t('Login.passwordRepeat') }}</label>
      <small
        v-if="!validPasswordRepeat && password !== '' && passwordRepeat !== ''"
        class="p-error"
      >
        {{ t('Login.SignUp.passwordUnequal') }}
      </small>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import InputText from 'primevue/inputtext'

import { computed, ref, watch } from 'vue'
import PasswordPrimevue from 'primevue/password'
import Divider from 'primevue/divider'

const emit = defineEmits<{
  'update:password': [password: string]
  'update:valid': [valid: boolean]
}>()
const props = defineProps<{ password: string; valid: boolean }>()

const localPassword = computed({
  get: () => props.password,
  set: (val: string) => emit('update:password', val),
})

const localValid = computed({
  get: () => props.valid,
  set: (val: boolean) => emit('update:valid', val),
})

const passwordRepeat = ref('')

const validPassword = computed(() => !passwordTooLong.value && !passwordTooShort.value)
const passwordTooShort = computed(() => localPassword.value.length < 8)
const passwordTooLong = computed(() => localPassword.value.length > 64)
const validPasswordRepeat = computed(() => localPassword.value === passwordRepeat.value)
const validCombination = computed(() => validPassword.value && validPasswordRepeat.value && localPassword.value !== '' && passwordRepeat.value !== '')

watch(
  () => validCombination.value,
  () => {
    localValid.value = validCombination.value
  }
)
</script>

<style scoped>
.floatingInput {
  width: 100%;
}
</style>

<style lang="scss" scoped>
::v-deep(.p-password input) {
  width: 100%;
}
</style>
