<template>
  <Tag
    :severity="statusSeverity"
    :value="$t(`Tournament.StatusBadge.${status}`)"
  />
</template>

<script setup lang="ts">
import Tag from 'primevue/tag'

import { publicTournament, privateTournament } from '@/../../shared/types/typesTournament'
import { computed } from 'vue'

const props = defineProps<{ status: publicTournament['status'] | privateTournament['status'] }>()

const statusSeverity = computed(() => {
  switch (props.status) {
    case 'signUp':
    case 'planned':
    case 'running':
      return 'warning'
    case 'signUpFailed':
    case 'aborted':
      return 'danger'
    case 'ended':
      return 'success'
    case 'signUpEnded':
    case 'signUpWaiting':
      return undefined
    default:
      return undefined
  }
})
</script>

<style scoped></style>
