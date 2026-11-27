<template>
  <div class="createPublic">
    <div class="createPublic-element">
      <label for="publicTournamentTitle">{{ t('Tournament.CreatePublic.title') }}</label>
      <InputText
        id="publicTournamentTitle"
        v-model="title"
        :invalid="title.length > 0 && !titleValid"
        maxlength="50"
      />
      <small
        v-if="title.length > 0 && !titleValid"
        class="custom-invalid"
      >
        {{ t('Tournament.CreatePublic.titleInvalid') }}
      </small>
    </div>

    <div class="createPublic-row">
      <div class="createPublic-element">
        <label for="publicTournamentBegin">{{ t('Tournament.signupbegin') }}</label>
        <DatePicker
          v-model="begin"
          input-id="publicTournamentBegin"
          show-time
          hour-format="24"
          :step-minute="15"
          date-format="dd.mm.yy"
        />
      </div>
      <div class="createPublic-element">
        <label for="publicTournamentDeadline">{{ t('Tournament.signUpDeadline') }}</label>
        <DatePicker
          v-model="deadline"
          input-id="publicTournamentDeadline"
          show-time
          hour-format="24"
          :step-minute="15"
          date-format="dd.mm.yy"
        />
      </div>
    </div>

    <div class="createPublic-row">
      <div class="createPublic-element">
        <label for="publicTournamentMaxTeams">{{ t(fluidSize ? 'Tournament.CreatePublic.maxTeams' : 'Tournament.CreatePublic.nTeams') }}</label>
        <Select
          v-model="maxTeams"
          input-id="publicTournamentMaxTeams"
          :options="teamCountOptions"
        />
      </div>
      <div class="createPublic-element">
        <label for="publicTournamentMinutes">{{ t('Tournament.CreatePublic.minutesPerGame') }}</label>
        <InputNumber
          v-model="minutesPerGame"
          input-id="publicTournamentMinutes"
          :min="15"
          :max="24 * 60 - 1"
          :step="15"
          show-buttons
          suffix=" min"
        />
      </div>
    </div>

    <div class="createPublic-element">
      <div class="createPublic-switch">
        <ToggleSwitch
          v-model="fluidSize"
          input-id="publicTournamentFluid"
        />
        <label for="publicTournamentFluid">{{ t('Tournament.CreatePublic.fluidSize') }}</label>
      </div>
      <small class="createPublic-hint">{{ t('Tournament.CreatePublic.fluidSizeHint') }}</small>
    </div>

    <div
      v-if="fluidSize"
      class="createPublic-element"
    >
      <label for="publicTournamentMinTeams">{{ t('Tournament.CreatePublic.minTeams') }}</label>
      <Select
        v-model="minTeams"
        input-id="publicTournamentMinTeams"
        :options="minTeamOptions"
      />
    </div>

    <div class="createPublic-element">
      <label>{{ t('Tournament.CreatePublic.roundDates') }}</label>
      <div
        v-for="(_, i) in roundDates"
        :key="`round-${i}`"
        class="createPublic-round"
      >
        <span class="createPublic-roundLabel">
          {{ t('Tournament.CreatePublic.round', { n: i + 1 }) }}
          <small v-if="isConditionalRound(i)">{{ t('Tournament.conditionalRound', { n: minTeamsForRoundKO(i) }) }}</small>
        </span>
        <DatePicker
          v-model="roundDates[i]"
          show-time
          hour-format="24"
          :step-minute="15"
          date-format="dd.mm.yy"
        />
      </div>
    </div>

    <div class="createPublic-element">
      <label>{{ t('Tournament.CreatePublic.preview') }}</label>
      <div
        v-for="line in preview"
        :key="`preview-${line.teams}`"
      >
        {{ t('Tournament.CreatePublic.previewLine', line) }}
      </div>
    </div>

    <Message
      v-if="dateError != null"
      severity="warn"
      class="createPublic-message"
    >
      {{ t(`Tournament.CreatePublic.errors.${dateError}`) }}
    </Message>

    <Button
      :label="t('Tournament.CreatePublic.createButton')"
      :disabled="!titleValid || dateError != null || loading"
      :loading="loading"
      @click="createTournament()"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import router from '@/router'
import { ApiError, DefaultService as Service } from '@/generatedClient/index.ts'
import { isValidTeamCountKO, maxTeamsKO, minTeamsForRoundKO, numberOfByesKO, numberOfRoundsKO } from '@/../../server/src/sharedDefinitions/tournamentKO'

const { t } = useI18n()
const toast = useToast()

const day = 24 * 60 * 60 * 1000

function nextFullHour() {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return date
}

const title = ref('')
const begin = ref<Date | null>(nextFullHour())
const deadline = ref<Date | null>(new Date(nextFullHour().getTime() + 7 * day))
const maxTeams = ref(16)
const fluidSize = ref(true)
const minTeams = ref(4)
const minutesPerGame = ref<number | null>(90)
const roundDates = ref<(Date | null)[]>([])
const loading = ref(false)

const titleValid = computed(() => title.value.trim().length >= 8 && title.value.length <= 50)

const teamCountOptions = [...Array(maxTeamsKO + 1).keys()].filter(isValidTeamCountKO)
const minTeamOptions = computed(() => teamCountOptions.filter((n) => n <= maxTeams.value))
watch(maxTeams, (max) => {
  if (minTeams.value > max) minTeams.value = max
})

const effectiveMinTeams = computed(() => (fluidSize.value ? minTeams.value : maxTeams.value))

function range(from: number, to: number) {
  return from === to ? `${from}` : `${from}–${to}`
}
// One line per number of rounds, e.g. "5–8 teams: 3 rounds, byes: 0–3"
const preview = computed(() => {
  const counts = teamCountOptions.filter((n) => n >= effectiveMinTeams.value && n <= maxTeams.value)
  const lines: { teams: string; rounds: number; byes: string }[] = []
  for (const rounds of [...new Set(counts.map(numberOfRoundsKO))]) {
    const withRounds = counts.filter((n) => numberOfRoundsKO(n) === rounds)
    const lo = withRounds[0]
    const hi = withRounds[withRounds.length - 1]
    lines.push({ teams: range(lo, hi), rounds, byes: range(numberOfByesKO(hi), numberOfByesKO(lo)) })
  }
  return lines
})

// Round i is only played if enough teams sign up. The last rounds are dropped when fewer teams sign up.
function isConditionalRound(roundIndex: number) {
  return effectiveMinTeams.value < minTeamsForRoundKO(roundIndex)
}

// One date per round of the maximum number of teams. New rounds get the day after the previous round as a suggestion.
watch(
  maxTeams,
  (max) => {
    const nRounds = numberOfRoundsKO(max)
    const dates = roundDates.value.slice(0, nRounds)
    while (dates.length < nRounds) {
      const previous = dates.length > 0 ? dates[dates.length - 1] : deadline.value
      dates.push(previous == null ? null : new Date(previous.getTime() + day))
    }
    roundDates.value = dates
  },
  { immediate: true }
)

type DateError = 'missing' | 'order' | 'overlap'
const dateError = computed<DateError | null>(() => {
  const dates = [begin.value, deadline.value, ...roundDates.value]
  if (dates.some((d) => d == null) || minutesPerGame.value == null) return 'missing'
  const times = dates.map((d) => (d as Date).getTime())
  for (let i = 1; i < times.length; i++) {
    if (times[i - 1] >= times[i]) return 'order'
  }
  for (let i = 3; i < times.length; i++) {
    if (times[i - 1] + minutesPerGame.value * 60 * 1000 > times[i]) return 'overlap'
  }
  return null
})

async function createTournament() {
  if (begin.value == null || deadline.value == null || minutesPerGame.value == null) return
  loading.value = true
  try {
    const tournament = await Service.createTournament({
      title: title.value.trim(),
      begin: begin.value.toISOString(),
      deadline: deadline.value.toISOString(),
      creationDates: roundDates.value.map((d) => (d as Date).toISOString()),
      secondsPerGame: minutesPerGame.value * 60,
      nTeams: maxTeams.value,
      minTeams: effectiveMinTeams.value,
    })
    toast.add({
      severity: 'success',
      summary: t('Tournament.CreatePublic.createdSummary'),
      detail: t('Tournament.CreatePublic.createdDetail'),
      life: 5000,
    })
    router.push({ name: 'PublicTournament', params: { id: tournament.id } })
  } catch (err) {
    console.error(err)
    const reason = err instanceof ApiError ? (err.body?.message ?? err.statusText) : String(err)
    toast.add({
      severity: 'error',
      summary: t('Toast.GenericError.summary'),
      detail: t('Tournament.CreatePublic.createError', { error: reason }),
      life: 10000,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.createPublic {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.createPublic-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.createPublic-element {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 10px 15px;
  max-width: 100%;
}

.createPublic-switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.createPublic-hint {
  max-width: 400px;
  opacity: 0.8;
}

.createPublic-round {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.createPublic-roundLabel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.createPublic-message {
  margin: 10px;
}
</style>
