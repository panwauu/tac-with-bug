<template>
  <transition-group name="emoji">
    <div
      v-for="(e, i) in emojiMessages.filter((e) => e.pos.includes('left'))"
      :key="`emojiDisplay-${i}`"
      class="emojiDisplay"
      :style="e.pos"
    >
      {{ e.text }}
    </div>
  </transition-group>
  <transition-group name="emojiRight">
    <div
      v-for="(e, i) in emojiMessages.filter((e) => e.pos.includes('right'))"
      :key="`emojiDisplay-${i}`"
      class="emojiDisplayRight"
      :style="e.pos"
    >
      {{ e.text }}
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { injectStrict, SocketKey } from '@/services/injections'
import { isEmoji } from '@/store/messages'
import type { ChatMessage } from '@/../../server/src/sharedTypes/chat'
import type { PositionStylesState } from '@/services/compositionGame/usePositionStyles'
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import router from '@/router'

const props = defineProps<{
  positionStyles: PositionStylesState
  miscState: MiscStateType
}>()

const socket = injectStrict(SocketKey)

const emojiMessages = ref<{ pos: string; text: string }[]>([])

function onNewMessage(data: { channel: string; messages: ChatMessage[] }) {
  if (router.currentRoute.value.query.gameID == null || data.channel !== `g-${router.currentRoute.value.query.gameID}`) {
    return
  }
  if (!isEmoji(data.messages[data.messages.length - 1].body)) {
    return
  }

  const body = data.messages[data.messages.length - 1].body
  const sender = data.messages[data.messages.length - 1].sender

  const index = props.miscState.players.findIndex((p) => {
    return p.name === sender
  })
  if (!(index >= 0 && index < props.miscState.nPlayers)) {
    return
  }

  if (props.positionStyles.stylePositionPictures === undefined) {
    return
  }
  const styles = props.positionStyles.stylePositionPictures[rotateIndex(index)]
  const left = styles.includes('left')
  const side = Number.parseFloat(styles.slice(styles.indexOf(left ? 'left' : 'right') + 6, styles.indexOf('%;', styles.indexOf(left ? 'left' : 'right')))) + 3
  const top = Number.parseFloat(styles.slice(styles.indexOf('top') + 5, styles.indexOf('%;', styles.indexOf('top')))) + 3

  emojiMessages.value.push({
    pos: `${left ? 'left' : 'right'}: ${side}%; top: ${top}%;`,
    text: body,
  })

  setTimeout(() => {
    emojiMessages.value.shift()
  }, 3000)
}

socket.on('channel:update', onNewMessage)
onUnmounted(() => {
  socket.off('channel:update', onNewMessage)
})

function rotateIndex(index: number) {
  return (index + props.miscState.players.length - props.positionStyles.nRotate) % props.miscState.players.length
}
</script>

<style scoped>
.emojiDisplay {
  position: absolute;
  z-index: 500;
  font-size: calc(var(--board-size-in-px) * 0.08);
  transform: translate(-50%, -50%);
}

@keyframes emojiEnter {
  0% {
    transform: translate(-50%, -50%) scale(0.001);
  }

  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}

.emoji-enter-active {
  animation: emojiEnter 1s;
}

@keyframes emojiLeave {
  0% {
    transform: translate(-50%, -50%);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, 1000px) scale(0.01);
    opacity: 0;
  }
}

.emoji-leave-active {
  animation: emojiLeave 2s;
}

.emojiDisplayRight {
  position: absolute;
  z-index: 500;
  font-size: calc(var(--board-size-in-px) * 0.08);
  transform: translate(50%, -50%);
}

@keyframes emojiEnterRight {
  0% {
    transform: translate(50%, -50%) scale(0.001);
  }

  100% {
    transform: translate(50%, -50%) scale(1);
  }
}

.emojiRight-enter-active {
  animation: emojiEnterRight 1s;
}

@keyframes emojiLeaveRight {
  0% {
    transform: translate(50%, -50%);
    opacity: 1;
  }

  100% {
    transform: translate(50%, 1000px) scale(0.01);
    opacity: 0;
  }
}

.emojiRight-leave-active {
  animation: emojiLeaveRight 2s;
}
</style>
