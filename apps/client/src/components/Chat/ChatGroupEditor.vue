<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <div class="groupPictureEditor">
      <img
        v-if="pictureSrc"
        class="groupPicture"
        :src="pictureSrc"
        alt=""
      />
      <div
        v-else
        class="groupPicture placeholder"
      >
        <i
          class="pi pi-comments"
          aria-hidden="true"
        />
      </div>
      <template v-if="!settingsStore.isBlockedByModeration">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="pictureChosen"
        />
        <Button
          :label="t('Chat.GroupChatEditor.changePicture')"
          icon="pi pi-image"
          size="small"
          :loading="uploading"
          @click="fileInput?.click()"
        />
        <Button
          v-if="pictureSrc"
          :label="t('Chat.GroupChatEditor.removePicture')"
          icon="pi pi-trash"
          size="small"
          severity="secondary"
          @click="removePicture"
        />
      </template>
    </div>
    <Divider />
    <InputGroup v-if="!settingsStore.isBlockedByModeration">
      <InputText v-model="groupTitle" />
      <Button
        icon="pi pi-check"
        severity="success"
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
      severity="danger"
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

import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { deleteGroupPicture, getGroupPictureSrc, uploadGroupPicture } from '@/services/useGroupPicture'
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

// Group picture: every member may change or remove it, the server resizes it
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const pictureSrc = computed(() => {
  const chat = messagesStore.getCurrentChat
  return chat == null ? undefined : getGroupPictureSrc(chat.chatid, chat.groupPicture)
})

async function pictureChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const chatid = messagesStore.getCurrentChat?.chatid
  input.value = ''
  if (file == null || chatid == null) return
  uploading.value = true
  const ok = await uploadGroupPicture(chatid, file)
  uploading.value = false
  if (!ok) {
    toast.add({ severity: 'error', summary: t('Chat.GroupChatEditor.pictureError'), life: 3000 })
  }
}

async function removePicture() {
  const chatid = messagesStore.getCurrentChat?.chatid
  if (chatid == null) return
  if (!(await deleteGroupPicture(chatid))) {
    toast.add({ severity: 'error', summary: t('Chat.GroupChatEditor.pictureError'), life: 3000 })
  }
}

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

<style scoped>
.groupPictureEditor {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.groupPicture {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}
.groupPicture.placeholder {
  display: grid;
  place-items: center;
  background: var(--p-content-hover-background, #eee);
  font-size: 1.6rem;
}
</style>
