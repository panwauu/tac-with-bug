<template>
  <div>
    <div>{{ t('Settings.ColorScheme.explanation') }}</div>
    <SelectButton
      v-model="value"
      :options="options"
      option-label="label"
      :allow-empty="false"
    >
      <template #option="slotProps">{{ t(slotProps.option.label) }}</template>
    </SelectButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { useColorSchemeStore, type ColorScheme } from '@/store/colorScheme'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const colorSchemeStore = useColorSchemeStore()

const options = ref<Array<{ label: string; value: ColorScheme }>>([
  { label: 'Settings.ColorScheme.system', value: 'system' },
  { label: 'Settings.ColorScheme.light', value: 'light' },
  { label: 'Settings.ColorScheme.dark', value: 'dark' },
])

const value = computed<{ label: string; value: ColorScheme }>({
  get: () => {
    return options.value.find((option) => option.value === colorSchemeStore.colorScheme) ?? options.value[0]
  },
  set: (val) => {
    colorSchemeStore.setColorScheme(val.value)
  },
})
</script>
