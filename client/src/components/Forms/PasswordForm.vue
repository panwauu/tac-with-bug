<template>
  <div class="floatingTextInput">
    <FloatLabel>
      <Password
        id="SUpassword"
        v-model="localPassword"
        type="password"
        name="password"
        style="width: 100%"
        :prompt-label="t('Login.SignUp.passwordChoose')"
        :weak-label="t('Login.SignUp.passwordWeak')"
        :medium-label="t('Login.SignUp.passwordMedium')"
        :strong-label="t('Login.SignUp.passwordStrong')"
        :invalid="!validPassword && password !== ''"
      >
        <template #footer>
          <Divider />
          <ul style="line-height: 1.5">
            <li :class="passwordTooShort ? 'custom-invalid' : ''">{{ t('Login.SignUp.passwordMinLetters') }}</li>
            <li :class="passwordTooLong ? 'custom-invalid' : ''">{{ t('Login.SignUp.passwordMaxLetters') }}</li>
          </ul>
        </template>
      </Password>
      <label for="SUpassword">{{ t('Login.password') }}</label>
    </FloatLabel>

    <FloatLabel class="floatingTextInput">
      <InputText
        id="SUpasswordRepeat"
        v-model="passwordRepeat"
        type="password"
        name="password"
        style="width: 100%"
        :invalid="!validPasswordRepeat && password !== ''"
      />
      <label for="SUpasswordRepeat">{{ t('Login.passwordRepeat') }}</label>
      <small
        v-if="!validPasswordRepeat && password !== '' && passwordRepeat !== ''"
        class="custom-invalid"
      >
        {{ t('Login.SignUp.passwordUnequal') }}
      </small>
    </FloatLabel>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import { computed, ref, watch } from 'vue'
import Password from 'primevue/password'
import Divider from 'primevue/divider'

const { t } = useI18n()
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
