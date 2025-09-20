<template>
  <div>
    <Button
      label="light"
      @click="setColorScheme('light')"
    />
    <Button
      label="dark"
      @click="setColorScheme('dark')"
    />
    <Button
      label="system"
      @click="setColorScheme('system')"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useColorSchemeStore, type ColorScheme } from '@/store/colorScheme'
const colorSchemeStore = useColorSchemeStore()

function setColorScheme(scheme: ColorScheme) {
  colorSchemeStore.setColorScheme(scheme)
}
</script>
