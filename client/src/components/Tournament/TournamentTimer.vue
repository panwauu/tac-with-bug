<template>
  <div v-if="tournament.status === 'signUpWaiting' || tournament.status === 'signUp' || tournament.status === 'signUpEnded' || tournament.status === 'running'">
    <div>{{ $t(`Tournament.CountdownTimer.${counterKey}`) }}</div>
    <CountdownTimer :endDate="deadlineForCounter" />
  </div>
</template>

<script setup lang="ts">
import type { publicTournament } from '@/../../server/src/sharedTypes/typesTournament'
import { computed } from 'vue'
import CountdownTimer from '@/components/CountdownTimer.vue'

const props = defineProps<{ tournament: publicTournament }>()

function addInterval(date: Date, interval: string): Date {
  const m = parseInt(interval.slice(interval.length - 2, interval.length))
  const h = parseInt(interval.slice(0, interval.length - 3))
  const returnDate = date
  returnDate.setMinutes(returnDate.getMinutes() + m)
  returnDate.setHours(returnDate.getHours() + h)
  return returnDate
}

const counterKey = computed(() => {
  if (props.tournament.status !== 'running') {
    return props.tournament.status
  }

  if (props.tournament.data.brackets[props.tournament.creationPhase - 2].every((m) => m.winner !== -1)) {
    return 'nextGame'
  } else {
    return 'gameEnd'
  }
})

const deadlineForCounter = computed(() => {
  const gameEndDate = addInterval(new Date(props.tournament.creationDates[props.tournament.creationPhase - 2]), props.tournament.timePerGame)

  switch (props.tournament.status) {
    case 'signUpWaiting':
      return props.tournament.signupBegin
    case 'signUp':
      return props.tournament.signupDeadline
    case 'signUpEnded':
      return props.tournament.creationDates[0]
    case 'running':
      if (props.tournament.data.brackets[props.tournament.creationPhase - 2].every((m) => m.winner !== -1)) {
        return props.tournament.creationDates[props.tournament.creationPhase - 1]
      } else {
        return gameEndDate.toISOString()
      }
    default:
      return new Date().toUTCString()
  }
})
</script>

<style scoped></style>
