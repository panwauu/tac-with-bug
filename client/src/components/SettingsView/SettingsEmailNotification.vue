<template>
  <div
    style="position: relative"
    class="notifications-container"
  >
    <p>{{ t('Settings.EmailNotifiactions.checkboxHeader') }}</p>
    <div>
      <div
        v-for="category of checkboxCategories"
        :key="category.key"
        class="field-checkbox"
      >
        <Checkbox
          :id="category.key"
          v-model="activatedElements"
          name="element"
          :value="category"
        />
        <label
          :for="category.key"
          class="checkbox-label"
        >
          {{ t(`Settings.EmailNotifiactions.${category.key}`) }}
        </label>
      </div>
    </div>

    <div
      v-if="loading"
      class="loading-screen"
    >
      <ProgressSpinner />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Checkbox from 'primevue/checkbox'
import ProgressSpinner from 'primevue/progressspinner'
import { DefaultService, Record_KeyOfEmailNotificationSettings_boolean_ } from '@/generatedClient/index'
import { computed, ref } from 'vue'

const notificationSettings = ref<Record_KeyOfEmailNotificationSettings_boolean_ | null>(null)
const checkboxCategories = computed(() => {
  return Object.entries(notificationSettings.value ?? {}).map((e) => {
    return { key: e[0], value: e[1] }
  })
})
const activatedElements = computed({
  get() {
    return checkboxCategories.value.filter((e) => e.value === true)
  },
  set(changes) {
    setValues(
      changes.map((c) => {
        return c.key
      })
    ).catch((err) => console.error(err))
  },
})
const loading = ref(true)

load().catch((err) => console.error(err))
async function load() {
  loading.value = true
  try {
    const res = await DefaultService.getEmailNotificationSettings()
    notificationSettings.value = res
  } finally {
    loading.value = false
  }
}

async function setValues(keys: string[]) {
  if (notificationSettings.value == null) return

  loading.value = true
  const waitPromise = new Promise((resolve) =>
    setTimeout(() => {
      resolve(null)
    }, 500)
  )
  const value = Object.keys(notificationSettings.value).reduce((obj, key) => {
    obj[key] = keys.includes(key)
    return obj
  }, {} as any)
  const res = await DefaultService.setEmailNotificationSettings(value)
  await waitPromise
  notificationSettings.value = res
  loading.value = false
}
</script>

<style scoped>
.loading-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--surface-a);
  opacity: 0.8;
}
.notifications-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.field-checkbox {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}
.checkbox-label {
  margin-left: 0.5rem;
  cursor: pointer;
}
</style>
