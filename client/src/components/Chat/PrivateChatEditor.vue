<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <Button
      :label="t('Chat.GroupChatEditor.leaveButton')"
      class="p-button-danger"
      @click="leaveChat"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import { useMessagesStore } from '@/store/messages'
import { injectStrict, SocketKey } from '@/services/injections'

const { t } = useI18n()

const emits = defineEmits<{ close: [] }>()

const socket = injectStrict(SocketKey)
const messagesStore = useMessagesStore()

async function leaveChat() {
  if (messagesStore.getCurrentChat?.chatid == null) {
    return
  }
  const data = await socket.emitWithAck(5000, 'chat:leaveChat', { chatid: messagesStore.getCurrentChat?.chatid })
  console.log(data)
  messagesStore.selectChat(true, 'general')
  emits('close')
}
</script>

<script scoped></script>
