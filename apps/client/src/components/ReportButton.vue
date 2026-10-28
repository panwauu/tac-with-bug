<template>
  <Button
    v-if="isLoggedIn && username !== loggedInUser"
    size="small"
    text
    severity="secondary"
    :label="t('Moderation.melden')"
    icon="pi pi-flag"
    @click="visible = true"
    style="margin-top: 10px"
  />
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :dismissable-mask="true"
    :header="t('Moderation.meldenTitel', { username })"
    style="max-width: 450px; width: 95vw"
  >
    <p class="report-hinweis">{{ t('Moderation.meldenHinweis') }}</p>
    <div class="report-feld">
      <label for="report-kategorie">{{ t('Moderation.grund') }}</label>
      <Select
        v-model="category"
        input-id="report-kategorie"
        :options="reportCategories.map((c) => ({ value: c, label: t(`Moderation.kategorie.${c}`) }))"
        option-label="label"
        option-value="value"
      />
    </div>
    <div class="report-feld">
      <label for="report-text">{{ t('Moderation.text') }}</label>
      <Textarea
        id="report-text"
        v-model="body"
        :maxlength="maxReportBodyLength"
        rows="4"
        auto-resize
      />
    </div>
    <template #footer>
      <Button
        :label="t('Moderation.abbrechen')"
        severity="secondary"
        text
        @click="visible = false"
      />
      <Button
        :label="t('Moderation.absenden')"
        icon="pi pi-send"
        :loading="sending"
        @click="send"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
// Melden eines Spielers (#254): Grund und kurzer Text, die Meldung geht an die Moderatoren.
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { injectStrict, SocketKey } from '@/services/injections'
import { isLoggedIn, username as loggedInUser } from '@/services/useUser'
import { reportCategories, type ReportCategory } from '@/../../server/src/sharedTypes/typesReports'
import { maxReportBodyLength } from '@/../../server/src/sharedDefinitions/reports'

const props = defineProps<{ username: string }>()

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)

const visible = ref(false)
const sending = ref(false)
const category = ref<ReportCategory>('username')
const body = ref('')

async function send() {
  sending.value = true
  const res = await socket.emitWithAck(5000, 'moderation:report', { username: props.username, category: category.value, body: body.value.trim() })
  sending.value = false
  if (res.status === 200) {
    toast.add({ severity: 'success', life: 5000, summary: t('Moderation.gemeldet'), detail: t('Moderation.gemeldetText') })
    visible.value = false
    body.value = ''
  } else if (res.error === 'ALREADY_REPORTED') {
    toast.add({ severity: 'info', life: 5000, summary: t('Moderation.schonGemeldet') })
    visible.value = false
  } else {
    toast.add({ severity: 'error', life: 5000, summary: t('Moderation.fehler') })
  }
}
</script>

<style scoped>
.report-hinweis {
  margin-top: 0;
}
.report-feld {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
</style>
