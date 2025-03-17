<template>
  <div
    v-if="username !== loggedInUsername"
    class="userDescription"
  >
    {{ userDescription || $t('Profile.DescriptionEditor.placeholder') }}
  </div>
  <div
    v-else
    class="userDescription"
  >
    <Textarea
      v-model="userDescription"
      :autoResize="true"
      style="width: 100%"
      :placeholder="$t('Profile.DescriptionEditor.editPlaceholder')"
      :disabled="!editing"
    />
    <small
      v-if="editing && descriptionTooLong"
      class="p-error"
    >
      {{ $t('Profile.DescriptionEditor.descriptionTooLong') }}
    </small>
    <div
      v-if="!settingsStore.isBlockedByModeration"
      class="editButton"
    >
      <Button
        v-show="!editing"
        icon="pi pi-pencil"
        class="p-button-rounded p-button-secondary"
        :disabled="editing"
        @click="startEdit"
      />
      <span class="p-buttonset">
        <Button
          v-show="editing"
          icon="pi pi-check"
          class="p-button-rounded p-button-success"
          :disabled="!editing || descriptionTooLong"
          @click="submitEdit"
        />
        <Button
          v-show="editing"
          icon="pi pi-times"
          class="p-button-rounded p-button-danger"
          :disabled="!editing"
          @click="resetValueAndEndEditing"
        />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'

import { ref, watch, computed } from 'vue'
import { username as loggedInUsername } from '@/services/useUser'
import { DefaultService as Service } from '@/generatedClient'
import { useToast } from 'primevue/usetoast'
import { i18n } from '@/services/i18n'
import { useSettingsStore } from '@/store/settings'

const emits = defineEmits<{ 'update:modelValue': [modelValue: string] }>()
const props = defineProps<{ username: string; modelValue: string }>()

const settingsStore = useSettingsStore()
const toast = useToast()
const editing = ref(false)
const userDescription = ref(props.modelValue)

watch(
  () => props.modelValue,
  () => {
    resetValueAndEndEditing()
  }
)
watch(
  () => props.username,
  () => {
    clearValueAndEndEditing()
  }
)

function startEdit() {
  userDescription.value = props.modelValue
  editing.value = true
}

function submitEdit() {
  editing.value = false
  Service.editUserDescription({ userDescription: userDescription.value })
    .then(() => {
      emits('update:modelValue', userDescription.value)
    })
    .catch(() => {
      resetValueAndEndEditing()
      toast.add({
        severity: 'error',
        summary: i18n.global.t('Toast.GenericError.summary'),
        detail: i18n.global.t('Toast.GenericError.detail'),
        life: 3000,
      })
    })
}

function clearValueAndEndEditing() {
  editing.value = false
  userDescription.value = ''
}

function resetValueAndEndEditing() {
  editing.value = false
  userDescription.value = props.modelValue
}

const descriptionTooLong = computed(() => userDescription.value.length > 150)
</script>

<style scoped>
.userDescription {
  position: relative;
  white-space: pre-wrap;
  width: 100%;
}

.editButton {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(0, -80%);
}
</style>
