<template>
  <Dialog
    v-model:visible="visible"
    :modal="true"
    :dismissable-mask="true"
    :header="t('Moderation.meldenTitel', { username })"
    style="max-width: 450px; width: 95vw"
  >
    <p class="report-hinweis">{{ t('Moderation.meldenHinweis') }}</p>
    <blockquote
      v-if="messageText != null"
      class="report-zitat"
    >
      {{ messageText }}
    </blockquote>
    <div
      v-else
      class="report-feld"
    >
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
        rows="3"
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
// Melden eines Spielers oder einer Chatnachricht (#254). Bei einer Nachricht kopiert der Server ihren Text in die Meldung.
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { injectStrict, SocketKey } from '@/services/injections'
import { reportCategories, type ReportCategory, type ReportedMessageRef } from '@/../../server/src/sharedTypes/typesReports'
import { maxReportBodyLength } from '@/../../server/src/sharedDefinitions/reports'

const props = defineProps<{ username: string; message?: ReportedMessageRef; messageText?: string }>()
const visible = defineModel<boolean>('visible', { required: true })

const { t } = useI18n()
const toast = useToast()
const socket = injectStrict(SocketKey)

const sending = ref(false)
const category = ref<ReportCategory>('username')
const body = ref('')

watch(visible, (v) => {
  if (v) category.value = props.message != null ? 'chat' : 'username'
})

async function send() {
  sending.value = true
  const res = await socket.emitWithAck(5000, 'moderation:report', {
    username: props.username,
    category: props.message != null ? 'chat' : category.value,
    body: body.value.trim(),
    ...(props.message != null ? { message: props.message } : {}),
  })
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
.report-zitat {
  margin: 0 0 12px 0;
  padding: 6px 10px;
  border-left: 3px solid var(--p-primary-color);
  background: var(--background-contraster);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.report-feld {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
</style>
