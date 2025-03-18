<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <InputGroup v-if="!settingsStore.isBlockedByModeration">
      <InputText v-model="groupTitle" />
      <Button
        icon="pi pi-check"
        class="p-button-success"
        :disabled="groupTitle === messagesStore.getCurrentChat?.groupTitle || groupTitle.length < 3 || groupTitle.length >= 25"
        @click="changeTitle"
      />
    </InputGroup>
    <div v-else>
      <BlockedByModerationMessage :blocked-by-moderation-until="settingsStore.blockedByModerationUntil ?? ''" />
    </div>
    <Divider />
    <PlayerWithPicture
      v-for="username in messagesStore.getCurrentChat?.players"
      :key="username"
      :username="username"
    />
    <template v-if="!settingsStore.isBlockedByModeration">
      <Divider />
      <PlayersAutoComplete
        v-model:username="userToAdd"
        v-model:userid="userIdToAdd"
      />
      <Button
        :label="t('Chat.GroupChatEditor.addPlayer')"
        style="margin-top: 10px"
        :disabled="userIdToAdd < 0 || userToAdd == ''"
        @click="addUser"
      />
    </template>
    <Divider />
    <Button
      :label="t('Chat.GroupChatEditor.leaveButton')"
      class="p-button-danger"
      @click="leaveChat"
    />
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import PlayerWithPicture from '../PlayerWithPicture.vue'
import PlayersAutoComplete from '../PlayersAutoComplete.vue'
import BlockedByModerationMessage from '../BlockedByModerationMessage.vue'
import InputGroup from 'primevue/inputgroup'

import { ref } from 'vue'
import { useMessagesStore } from '@/store/messages'
import { injectStrict, SocketKey } from '@/services/injections'
import { useSettingsStore } from '@/store/settings'
import { useI18n } from 'vue-i18n'

const emits = defineEmits<{ close: [] }>()

const { t } = useI18n()
const socket = injectStrict(SocketKey)
const messagesStore = useMessagesStore()
const settingsStore = useSettingsStore()

const groupTitle = ref(messagesStore.getCurrentChat?.groupTitle ?? '')

async function changeTitle() {
  if (messagesStore.getCurrentChat?.chatid == null) {
    return
  }
  await socket.emitWithAck(5000, 'chat:changeTitle', { chatid: messagesStore.getCurrentChat?.chatid, title: groupTitle.value })
}

const userToAdd = ref('')
const userIdToAdd = ref(-1)

async function addUser() {
  if (messagesStore.getCurrentChat?.chatid == null) {
    return
  }
  const data = await socket.emitWithAck(5000, 'chat:addUser', { userid: userIdToAdd.value, chatid: messagesStore.getCurrentChat?.chatid })
  console.log(data)
  userToAdd.value = ''
  userIdToAdd.value = -1
}

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
