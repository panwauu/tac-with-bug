<template>
  <Message
    severity="warn"
    :closable="false"
    :pt="{
      wrapper: {
        style: 'padding: 0.75rem',
      },
      text: {
        style: 'font-size: small',
      },
    }"
    :title="$t('Moderation.you-are-blocked-explanation')"
  >
    {{ $t('Moderation.you-are-blocked-message', [new Date(blockedByModerationUntil).toLocaleDateString()]) }}
  </Message>
</template>

<script setup lang="ts">
import Message from 'primevue/message'

defineProps<{ blockedByModerationUntil: string }>()
</script>

<style scoped></style>
