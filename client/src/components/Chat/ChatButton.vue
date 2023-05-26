<template>
  <Button
    v-if="!chatStore.displayChat"
    aria-label="open chat"
    :class="['chatButton', 'buttonPosition', chatStore.collapseButton ? 'buttonPositionCollapsing' : '']"
    @click="openChat()"
  >
    <i
      class="pi pi-comments"
      style="font-size: 2rem"
      aria-hidden="true"
    />
    <Badge
      v-if="messagesStore.notificationsChat !== 0"
      :value="messagesStore.notificationsChat.toString()"
      severity="danger"
      class="notiBadge badgeGame"
    />
    <Badge
      v-if="messagesStore.notificationsChannels !== 0"
      :value="messagesStore.notificationsChannels.toString()"
      severity="warning"
      class="notiBadge badgeGeneral"
    />
  </Button>
</template>

<script setup lang="ts">
import { useChatStore } from '@/store/chat'
import { useMessagesStore } from '@/store/messages'
import Badge from 'primevue/badge'
import Button from 'primevue/button'

const chatStore = useChatStore()
const messagesStore = useMessagesStore()
const emit = defineEmits<{ openChat: [] }>()

const openChat = () => {
  emit('openChat')
}
</script>

<style lang="scss">
.chatBody > .p-scrollpanel > .p-scrollpanel-wrapper > .p-scrollpanel-content {
  padding-bottom: 0px;
}
</style>

<style scoped>
.chatButton {
  position: fixed;
  z-index: 1000;
  transform: translate(0, 0);
  transition: all 0.5s;
}

.chatButton:hover {
  transform: translate(0, 0);
}

.buttonPosition {
  right: 10px;
  bottom: 10px;
}

.buttonPositionCollapsing {
  right: 0px;
  left: auto;
  top: auto;
  bottom: 10px;
  transform: translate(75%, 0);
}

.notiBadge {
  position: absolute;
  margin: 0 !important;
  left: 0;
}

.badgeGame {
  top: 0;
}

.badgeGeneral {
  bottom: 0;
}
</style>
