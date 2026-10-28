<template>
  <Button
    v-if="isLoggedIn && username !== loggedInUser"
    size="small"
    text
    severity="secondary"
    :label="t('Moderation.melden')"
    icon="pi pi-flag"
    style="margin-top: 10px"
    @click="visible = true"
  />
  <ReportDialog
    v-model:visible="visible"
    :username="username"
  />
</template>

<script setup lang="ts">
// Melden eines Spielers (#254) aus dem Profil
import Button from 'primevue/button'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ReportDialog from '@/components/ReportDialog.vue'
import { isLoggedIn, username as loggedInUser } from '@/services/useUser'

defineProps<{ username: string }>()

const { t } = useI18n()
const visible = ref(false)
</script>
