<template>
  <form
    class="sperren"
    @submit.prevent="sperren"
  >
    <div class="sperren-zeile">
      <Select
        v-model="tage"
        :options="dauerOptionen"
        option-label="label"
        option-value="value"
        size="small"
        :placeholder="t('Moderation.dauer')"
      />
      <InputText
        v-model="grund"
        size="small"
        :placeholder="t('Moderation.sperrgrund')"
        maxlength="200"
        class="sperren-grund"
      />
      <Button
        type="submit"
        size="small"
        severity="danger"
        :label="t('Moderation.sperren')"
        :disabled="tage == null || grund.trim() === ''"
        :loading="laeuft"
      />
    </div>
    <label class="sperren-check">
      <Checkbox
        v-model="zuruecksetzen"
        binary
        size="small"
      />
      {{ t('Moderation.profilZuruecksetzen') }}
    </label>
  </form>
</template>

<script setup lang="ts">
// Sperrformular der Moderation: Dauer, Grund und optional Profilbild und Profiltext zurücksetzen
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { injectStrict, SocketKey } from '@/services/injections'

const props = defineProps<{ username: string }>()
const emit = defineEmits<{ blocked: [] }>()

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)

const tage = ref<number | undefined>()
const grund = ref('')
const zuruecksetzen = ref(false)
const laeuft = ref(false)

const dauerOptionen = [1, 7, 30, 365].map((d) => ({ value: d, label: t(`Moderation.dauerTage.d${d}`) }))

async function sperren() {
  if (tage.value == null || grund.value.trim() === '') return
  laeuft.value = true
  const res = await socket.emitWithAck(5000, 'moderation:block', {
    username: props.username,
    days: tage.value,
    reason: grund.value.trim(),
    resetProfile: zuruecksetzen.value,
  })
  laeuft.value = false
  if (res.status !== 200) {
    toast.add({ severity: 'error', life: 5000, summary: t('Moderation.fehler') })
    return
  }
  toast.add({ severity: 'success', life: 5000, summary: t('Moderation.gesperrt', { username: props.username }) })
  grund.value = ''
  tage.value = undefined
  zuruecksetzen.value = false
  emit('blocked')
}
</script>

<style scoped>
.sperren-zeile {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sperren-grund {
  flex: 1 1 180px;
}
.sperren-check {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
  font-size: small;
  opacity: 0.8;
  cursor: pointer;
}
</style>
