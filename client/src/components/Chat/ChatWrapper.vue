<template>
  <splitpanes
    class="default-theme"
    :dbl-click-splitter="false"
    :horizontal="true"
    style="width: 100%; height: 100%"
    @resize="resize($event)"
  >
    <pane>
      <splitpanes
        class="default-theme"
        :dbl-click-splitter="false"
        :horizontal="false"
        style="width: 100%; height: 100%"
        @resize="resize($event)"
      >
        <pane>
          <slot />
        </pane>
        <pane
          v-if="chatStore.displayChat && chatStore.chatPosition === 'right'"
          :size="chatStore.rightChatSize"
          :min-size="10"
        >
          <ChatInterface />
        </pane>
      </splitpanes>
    </pane>
    <pane
      v-if="chatStore.displayChat && chatStore.chatPosition === 'bottom'"
      :size="chatStore.bottomChatSize"
      :min-size="10"
    >
      <ChatInterface class="p-card paneChat" />
    </pane>
  </splitpanes>
  <ChatButton @openChat="chatStore.openChat()" />
  <transition name="chatOverlay">
    <div
      v-if="chatStore.displayChat && chatStore.chatPosition === 'overlay'"
      :class="['chatInterface', 'chatInterfaceSize', 'positionChat']"
    >
      <ChatInterface />
    </div>
  </transition>
</template>

<script setup lang="ts">
import ChatInterface from '@/components/Chat/ChatInterface.vue';
import ChatButton from '@/components/Chat/ChatButton.vue';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { useChatStore } from '@/store/chat';

const chatStore = useChatStore()

const resize = ($event: { min: number, max: number, size: number }[]) => {
  chatStore.setChatSize($event[0].size);
}
</script>

<style scoped>
@keyframes chatOverlay {
  0% {
    opacity: 0;
    transform: scale(0.01);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.chatOverlay-enter-active {
  animation: chatOverlay 0.5s;
}
.chatOverlay-leave-active {
  animation: chatOverlay 0.5s reverse;
}

.chatInterface {
  position: fixed;
  transform-origin: 100% 100%;
  z-index: 1500;
}

.positionChat {
  right: 10px;
  bottom: 10px;
}

.chatInterfaceSize {
  width: 500px;
  height: 80vh;
}

@media (max-width: 600px), (max-height: 600px) {
  .positionChat {
    right: 0px;
    bottom: 0px;
  }

  .chatInterfaceSize {
    width: 100%;
    height: 100%;
  }
}
</style>

<style>
.splitpanes.default-theme .splitpanes__pane {
  background: transparent;
}
.splitpanes__splitter {
  background: var(--surface-d) !important;
}
.default-theme.splitpanes--horizontal > .splitpanes__splitter,
.default-theme .splitpanes--horizontal > .splitpanes__splitter {
  border-top: 1px solid var(--surface-d) !important;
}
.default-theme.splitpanes--vertical > .splitpanes__splitter,
.default-theme .splitpanes--vertical > .splitpanes__splitter {
  border-left: 1px solid var(--surface-d) !important;
}
:not(.splitpanes--dragging) > .splitpanes__pane {
  transition: height 0.2s ease-out, width 0.2s ease-out !important;
}
</style>
