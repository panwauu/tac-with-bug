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
    :title="secondPerson === true ? t('Moderation.he-was-blocked-explanation') : t('Moderation.you-are-blocked-explanation')"
  >
    {{
      secondPerson === true
        ? t('Moderation.he-is-blocked-message', [new Date(blockedByModerationUntil).toLocaleDateString()])
        : t('Moderation.you-are-blocked-message', [new Date(blockedByModerationUntil).toLocaleDateString()])
    }}
  </Message>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Message from 'primevue/message'

defineProps<{ blockedByModerationUntil: string; secondPerson?: boolean | null }>()
</script>

<style scoped></style>
