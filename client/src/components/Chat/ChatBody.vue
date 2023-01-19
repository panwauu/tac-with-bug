<template>
  <div style="height: 100%; display: flex; flex-direction: column">
    <div class="topbar">
      <div style="position: relative">
        <Button
          aria-label="open sidebar"
          :icon="`pi pi-${chatStore.displayChatMenu ? 'arrow-left' : 'bars'}`"
          class="p-button-rounded p-button-text sidebarButton"
          @click="chatStore.toggleChatMenu"
        />
        <Badge
          v-if="messagesStore.notificationsChat + messagesStore.notificationsChannels - messagesStore.getChatNotifications !== 0 && !chatStore.displayChatMenu"
          style="position: absolute; right: 0; top: 0"
          :value="(messagesStore.notificationsChat + messagesStore.notificationsChannels - messagesStore.getChatNotifications).toString()"
          severity="danger"
        />
      </div>
      <i
        style="font-size: 1fr"
        :class="`pi pi-${messagesStore.getChatIcon}`"
        aria-hidden="true"
      />
      <div class="chatName">{{ formatChannelName(messagesStore.getChatLabel, messagesStore.selectedChat.type === 'channel') }}</div>
      <Badge
        v-if="messagesStore.getChatNotifications !== 0"
        style="margin-left: 10px"
        :value="messagesStore.getChatNotifications.toString()"
        :severity="messagesStore.selectedChat.type === 'chat' ? 'danger' : 'warning'"
      />
      <Button
        v-if="messagesStore.getCurrentChat != null"
        aria-label="edit chat"
        icon="pi pi-pencil"
        class="p-button-rounded p-button-text"
        @click="toggle"
      />
      <div style="margin: 0 auto" />
      <Button
        aria-label="close chat"
        icon="pi pi-times"
        class="p-button-rounded p-button-text closeButton"
        @click="chatStore.closeChat()"
      />
    </div>
    <div
      ref="chatBodyMessagesRef"
      class="chatBodyMessages"
      @click="messagesStore.markAsRead"
    >
      <div class="chatBodyMessagesInner">
        <div
          v-for="(messageGroup, messageGroupIndex) in messagesStore.getDateGroupedChatMessages"
          :key="`chatGroup-${messageGroupIndex}`"
        >
          <div class="chatMessagesDate">
            <div class="chatMessagesDateInner">{{ beautifyDate(messageGroup.date) }}</div>
          </div>
          <TransitionGroup name="chatmessage">
            <div
              v-for="(message, messageIndex) in messageGroup.messages"
              :key="`message-${String(messageIndex)}`"
              :class="[
                'chatMessageContainer',
                message.sender === username ? 'chatMessageContOwn' : 'chatMessageContFor',
                message.sender != null && messageIndex >= 1 && message.sender === messageGroup.messages[messageIndex - 1].sender ? 'chatMessageContainerNotNew' : '',
              ]"
            >
              <div
                class="p-card chatMessage"
                :class="{
                  chatMessageOwn: message.sender === username && displaySenderAndTime(messageGroup, messageIndex),
                  chatMessageNotOwn: message.sender !== username && displaySenderAndTime(messageGroup, messageIndex),
                }"
              >
                <div
                  v-if="displaySenderAndTime(messageGroup, messageIndex)"
                  class="chatMessageHeader"
                >
                  <ProfilePicture
                    v-if="isLoggedIn && message.sender != null"
                    :username="message.sender"
                    class="chatUserPicture"
                  />
                  <div class="chatUsername">{{ message.sender ?? $t('Chat.deletedPlayer') }}</div>
                </div>
                <div class="chatMessageBody">{{ message.body }}</div>
                <div class="chatMessageFooter">
                  {{
                    new Date(message.created).toLocaleTimeString(currentLocale, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  }}
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
      <Transition>
        <Button
          v-if="y < -20"
          icon="pi pi-arrow-down"
          class="p-button-rounded scrollDownButton"
          @click="scrollDown"
        />
      </Transition>
    </div>
    <div
      v-if="isLoggedIn"
      class="chatFooter"
      @click="messagesStore.markAsRead"
    >
      <form
        v-if="!messagesStore.mayNotUseChat && !(messagesStore.selectedChat.type === 'channel' && messagesStore.selectedChat.id === 'news' && !settingsStore.admin)"
        style="height: 100%"
        @submit.prevent="submitChatInput"
      >
        <div
          class="p-inputgroup"
          style="width: 100%"
        >
          <Textarea
            v-model="inputMessage"
            :autoResize="true"
            :rows="1"
            aria-label="chat text input"
            :placeholder="$t('Chat.textPlaceholder')"
            @keydown="textAreaKeydown($event)"
          />
          <Button
            type="submit"
            :label="$t('Chat.submitButton')"
            :disabled="inputMessage === '' || inputMessage.length > 500"
          />
        </div>
      </form>
      <Message
        v-if="messagesStore.mayNotUseChat"
        severity="warn"
        :sticky="true"
        :closable="false"
        style="margin: 0"
      >
        {{ $t('Chat.mayNotUseOverlay') }}
      </Message>
      <Message
        v-if="messagesStore.selectedChat.type === 'channel' && messagesStore.selectedChat.id === 'news' && !settingsStore.admin"
        severity="warn"
        :sticky="true"
        :closable="false"
        style="margin: 0"
      >
        {{ $t('Chat.onlyAdminsOverlay') }}
      </Message>
    </div>

    <OverlayPanel
      ref="overlayPanelRef"
      :showCloseIcon="true"
      :dismissable="true"
      appendTo="body"
      :baseZIndex="1000"
    >
      <ChatGroupEditor
        v-if="messagesStore.getCurrentChat?.groupChat"
        @close="closeOverlay"
      />
      <PrivateChatEditor
        v-else
        @close="closeOverlay"
      />
    </OverlayPanel>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import ProfilePicture from '../ProfilePicture.vue'
import OverlayPanel from 'primevue/overlaypanel'
import ChatGroupEditor from './ChatGroupEditor.vue'
import PrivateChatEditor from './PrivateChatEditor.vue'
import Message from 'primevue/message'
import Badge from 'primevue/badge'

import { useScroll } from '@vueuse/core'
import { useChatStore } from '@/store/chat'
import { useMessagesStore, formatChannelName } from '@/store/messages'
import { isLoggedIn, username } from '@/services/useUser'
import { ref } from 'vue'
import { i18n, currentLocale } from '@/services/i18n'
import { useSettingsStore } from '@/store/settings'
import type { ChatMessage } from '../../../../server/src/sharedTypes/chat'

const chatStore = useChatStore()
const messagesStore = useMessagesStore()
const settingsStore = useSettingsStore()

function displaySenderAndTime(
  messageGroup: {
    date: string
    messages: ChatMessage[]
  },
  messageIndex: number
): boolean {
  return messageIndex === 0 || messageGroup.messages[messageIndex].sender !== messageGroup.messages[messageIndex - 1].sender
}

function beautifyDate(timestamp: string): string {
  const date = new Date(timestamp)
  if (new Date().toDateString() === date.toDateString()) {
    return i18n.global.t('Chat.Dates.today')
  } else if (new Date(new Date().getTime() - 1000 * 60 * 60 * 24).toDateString() === date.toDateString()) {
    return i18n.global.t('Chat.Dates.yesterday')
  } else if (new Date().getTime() - date.getTime() < 1000 * 60 * 60 * 24 * 7) {
    return date.toLocaleString(currentLocale.value, { weekday: 'long' })
  }
  return date.toLocaleDateString(currentLocale.value)
}

const inputMessage = ref('')

function submitChatInput() {
  if (inputMessage.value === '' || inputMessage.value.length > 500) {
    return
  }
  messagesStore.sendMessage(inputMessage.value)
  inputMessage.value = ''
  scrollDown()
}

function textAreaKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (inputMessage.value.length <= 500) {
      submitChatInput()
    }
  }
}

const overlayPanelRef = ref<OverlayPanel | null>()
function toggle(event: any) {
  overlayPanelRef.value?.toggle(event)
}
function closeOverlay() {
  overlayPanelRef.value?.hide()
}

const chatBodyMessagesRef = ref<null | HTMLElement>()
const { y } = useScroll(chatBodyMessagesRef)
function scrollDown() {
  chatBodyMessagesRef.value?.scroll(0, 0)
}
</script>

<style scoped>
.topbar {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  box-shadow: 0px 3px 3px -3px var(--gray-600);
}

.scrollDownButton {
  position: absolute;
  top: 55px;
  right: 15px;
  z-index: 2;
}

.chatName {
  font-size: large;
  font-weight: bold;
}

.sidebarButton {
  margin: 5px 15px 5px 5px;
}

.closeButton {
  margin: 5px 5px 5px 15px;
}

.chatBodyMessages {
  display: flex;
  flex-direction: column-reverse;
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 10px 0px;
  padding: 0px 13px;
  scroll-behavior: smooth;
}

.chatBodyMessagesInner {
  margin-bottom: auto;
}

.chatMessageContainer {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 13px 0px 2px 0px;
}

.chatMessagesDate {
  position: sticky;
  top: 0;
  margin-top: 10px;
  display: flex;
  z-index: 1;
}

.chatMessagesDateInner {
  margin: 0 auto;
  background: var(--surface-d);
  padding: 5px;
  border-radius: 5px;
  font-size: small;
  font-weight: bold;
}

.chatMessageContainerNotNew {
  padding: 2px 0px 2px 0px;
}

.chatMessageContOwn {
  align-items: flex-end;
}

.chatMessageContFor {
  align-items: flex-start;
}

.chatUserPicture {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
}

.chatTimestamp {
  margin: 0 5px;
}

.chatUsername {
  margin: 0 5px;
}

.chatMessage {
  box-shadow: 0px 3px 5px -5px var(--gray-600);
  border-radius: 5px;
  background: var(--surface-b);
  padding: 7px 7px 10px 7px;
  max-width: 70%;
  min-width: 50px;
  position: relative;
}

.chatMessage::before {
  content: '';
  position: absolute;
  top: 12px;
  width: 0;
  height: 0;
  border: 10px solid transparent;
  border-top: 0;
  margin-top: -5px;
}

.chatMessageOwn::before {
  right: 0;
  margin-right: -10px;
  border-left-color: var(--surface-b);
  border-right: 0;
}

.chatMessageNotOwn::before {
  left: 0;
  margin-left: -10px;
  border-right-color: var(--surface-b);
  border-left: 0;
}

.chatMessageHeader {
  display: flex;
  align-items: center;
  font-weight: bold;
  font-size: small;
  margin: 0px 0px 3px 0px;
}

.chatMessageBody {
  max-width: 100%;
  overflow: hidden;
  white-space: pre-line;
}

.chatMessageFooter {
  font-size: xx-small;
  font-weight: bold;
  float: right;
  margin: 2px -2px -5px 4px;
}

.chatMessageNotEnlarged {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: 5px;
}

.chatFooter {
  transition: all 0.5s;
  margin: 0px 10px 10px 10px;
}

.chatFooterCollapsed {
  height: 0px;
  margin: 0;
  transform: translateY(100px);
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.chatmessage-move,
.chatmessage-enter-active {
  transition: all 0.5s ease;
}

.chatmessage-enter-from {
  opacity: 0;
  transform: translateY(50px);
}
</style>
