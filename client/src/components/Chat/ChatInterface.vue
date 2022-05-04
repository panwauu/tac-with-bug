<template>
  <div ref="chatContainerRef" class="p-card chatContainer">
    <div
      :class="{ 'chatBody': true, 'withSidebar': chatStore.displayChatMenu && !chatStore.responsiveMode }"
    >
      <ChatBody />
      <Transition>
        <div
          v-if="chatStore.displayChatMenu && chatStore.responsiveMode"
          class="clickOverlay"
          @click="closeMenuIfResponsive"
        />
      </Transition>
    </div>
    <div :class="{ 'chatSidebar': true, 'chatSidebar-hidden': !chatStore.displayChatMenu }">
      <ChatMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatMenu from './ChatMenu.vue';
import ChatBody from './ChatBody.vue';

import { ref } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { useChatStore } from '@/store/chat';

const chatStore = useChatStore()

const chatContainerRef = ref<null | HTMLElement>();
useResizeObserver(chatContainerRef, (targets) => {
  chatStore.setResponsiveMode(targets[0].contentRect.width < 500)
})

function closeMenuIfResponsive() { console.log('Click'); if (chatStore.responsiveMode && chatStore.displayChatMenu) { chatStore.closeChatMenu() } }
</script>

<style scoped>
.chatContainer {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border: solid 2px var(--surface-d);
}

.chatSidebar {
  position: absolute;
  width: 200px;
  max-width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transition: transform 0.3s ease 0s;
  box-shadow: 2px 0px 3px -3px var(--gray-400);
  background: var(--surface-e);
  z-index: 1;
}

.chatSidebar-hidden {
  transform: translateX(-250px);
}

.chatBody {
  height: 100%;
  width: 100%;
  transition: margin 0.3s ease 0s, width 0.3s ease 0s;
  position: relative;
  background: var(--surface-e);
}
.withSidebar {
  margin-left: 200px;
  width: calc(100% - 200px);
}
.clickOverlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: var(--surface-b);
  opacity: 0.7;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>