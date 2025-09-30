<template>
  <div
    v-if="username !== loggedInUsername"
    class="userDescription"
  >
    {{ userDescription || t('Profile.DescriptionEditor.placeholder') }}
  </div>
  <div
    v-else
    class="userDescription"
  >
    <Textarea
      v-model="userDescription"
      :auto-resize="true"
      style="width: 100%"
      :placeholder="t('Profile.DescriptionEditor.editPlaceholder')"
      :disabled="!editing"
    />
    <small
      v-if="editing && descriptionTooLong"
      class="custom-invalid"
    >
      {{ t('Profile.DescriptionEditor.descriptionTooLong') }}
    </small>
    <div
      v-if="!settingsStore.isBlockedByModeration"
      class="editButton"
    >
      <Button
        v-show="!editing"
        icon="pi pi-pencil"
        rounded
        severity="secondary"
        :disabled="editing"
        @click="startEdit"
      />
      <ButtonGroup>
        <Button
          v-show="editing"
          icon="pi pi-check"
          rounded
          severity="success"
          :disabled="!editing || descriptionTooLong"
          @click="submitEdit"
        />
        <Button
          v-show="editing"
          icon="pi pi-times"
          rounded
          severity="danger"
          :disabled="!editing"
          @click="resetValueAndEndEditing"
        />
      </ButtonGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import ButtonGroup from 'primevue/buttongroup'
import { ref, watch, computed } from 'vue'
import { username as loggedInUsername } from '@/services/useUser'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { useToast } from 'primevue/usetoast'
import { useSettingsStore } from '@/store/settings'

const props = defineProps<{ username: string; value: string }>()

const settingsStore = useSettingsStore()
const toast = useToast()
const editing = ref(false)
const userDescription = ref(props.value)

watch(
  () => props.value,
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
  userDescription.value = props.value
  editing.value = true
}

function submitEdit() {
  editing.value = false
  Service.editUserDescription({ userDescription: userDescription.value }).catch(() => {
    resetValueAndEndEditing()
    toast.add({
      severity: 'error',
      summary: t('Toast.GenericError.summary'),
      detail: t('Toast.GenericError.detail'),
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
  userDescription.value = props.value
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
