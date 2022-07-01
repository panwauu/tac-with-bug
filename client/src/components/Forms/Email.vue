<template>
  <span :class="['p-float-label', 'floatingTextInput', iconClass]">
    <i v-if="emailCheck === null" class="pi pi-spin pi-spinner" />
    <i v-if="emailCheck === true" class="pi pi-check" />
    <InputText
      id="SUemail"
      v-model="localEmail"
      type="text"
      name="email"
      style="width: 100%"
      :class="localValid || localEmail === '' ? '' : 'p-invalid'"
    />
    <label for="SUemail">{{ $t("Login.email") }}</label>
    <small class="p-error">{{ emailErrorLabel }}</small>
  </span>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext';

import { ref, computed, watch } from 'vue';
import { Service } from '@/generatedClient/index';
import { i18n } from '@/services/i18n';
import * as EmailValidator from 'email-validator';

let emailCheck = ref<boolean | null>(false)
let emailCheckTimeout = ref(undefined as number | undefined)

const emit = defineEmits<{
    (eventName: 'update:email', email: string): void,
    (eventName: 'update:valid', valid: boolean): void
}>()
const props = defineProps<{ email: string, valid: boolean }>()

const localEmail = computed({
    get: () => props.email,
    set: (val: string) => emit('update:email', val)
})

const localValid = computed({
    get: () => props.valid,
    set: (val: boolean) => emit('update:valid', val)
})

watch(() => localEmail.value,
    () => {
        clearTimeout(emailCheckTimeout.value);
        if (!validMail.value) {
            emailCheck.value = false;
            localValid.value = false;
        } else {
            emailCheck.value = null
            emailCheckTimeout.value = window.setTimeout(() => checkEmail(), 200);
        }
    })

async function checkEmail() {
    emailCheck.value = await Service.isEmailFree(localEmail.value);
    localValid.value = emailCheck.value && validMail.value
}

const validMail = computed(() => EmailValidator.validate(localEmail.value))

const emailErrorLabel = computed(() => {
    if (localEmail.value !== '') {
        if (!validMail.value) {
            return i18n.global.t('Login.SignUp.emailInvalid');
        } else if (emailCheck.value === false) {
            return i18n.global.t('Login.SignUp.emailNotAvailable');
        }
    }
    return '';
})

const iconClass = computed(() => {
    return emailCheck.value === null || emailCheck.value === true ? 'p-input-icon-right' : '';
})
</script>

<style scoped>
</style>
