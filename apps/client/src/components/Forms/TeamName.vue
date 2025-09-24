<template>
  <FloatLabel>
    <InputText
      id="signUpTeamName"
      v-model="localTeamName"
      type="text"
      name="teamname"
      style="width: 100%"
      :invalid="localTeamName !== '' && !validTeamName"
      :disabled="disabled"
    />
    <label for="signUpTeamName">{{ t('Tournament.SignUp.teamNamePlaceholder') }}</label>
    <small
      v-if="!(localTeamName === '' || validTeamName) && !disabled"
      class="custom-invalid"
    >
      {{ t('Tournament.SignUp.invalidTeamName') }}
    </small>
    <small
      v-if="!(localTeamName === '' || newName) && !disabled"
      class="custom-invalid"
    >
      {{ t('Tournament.SignUp.notNewTeamName') }}
    </small>
  </FloatLabel>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'

import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits<{ 'update:teamname': [teamname: string]; 'update:valid': [valid: boolean] }>()
const props = defineProps<{ teamname: string; disabled: boolean; existingTeamNames: string[]; valid: boolean }>()

const localTeamName = computed({
  get: () => props.teamname,
  set: (val: string) => emit('update:teamname', val),
})

const letters = /^[A-Za-z\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df0-9._ +<>-]+$/
const blanks = /^ +$/

const validTeamName = computed(() => {
  return (
    localTeamName.value.trim() === localTeamName.value &&
    localTeamName.value.length < 25 &&
    localTeamName.value.length >= 5 &&
    localTeamName.value.match(letters) != null &&
    localTeamName.value.match(blanks) === null
  )
})

const newName = computed(() => {
  return !props.existingTeamNames.includes(localTeamName.value)
})

const validName = computed(() => {
  return (newName.value && validTeamName.value) || props.disabled
})

watch(
  () => [validName.value],
  () => {
    emit('update:valid', validTeamName.value)
  },
  { deep: true }
)
</script>
