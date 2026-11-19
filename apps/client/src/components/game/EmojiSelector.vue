<template>
  <div style="display: flex; overflow-x: auto; min-width: 20px; min-height: 20px">
    <div
      v-for="(emoji, i) in emojiList"
      :key="`EmojiList${i}`"
      style="font-size: 2rem; display: flex; align-items: center"
    >
      <div
        class="clickable"
        @click="sendEmoji(emoji)"
      >
        {{ emoji }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MiscStateType } from '@/services/compositionGame/useMisc'
import { useMessagesStore } from '@/store/messages'
import { injectStrict, SocketKey } from '@/services/injections'
import { useSubscription } from '@/services/useSubscription'
import { useInGameEmojis } from '@/services/useInGameEmojis'

const props = defineProps<{ miscState: MiscStateType }>()
const emit = defineEmits<{ close: [] }>()

// Eigene Auswahl (Einstellungen, nur mit Abo), sonst die Standard-Emojis
const subscriptionState = useSubscription(injectStrict(SocketKey))
const { aktiv: emojiList } = useInGameEmojis(() => subscriptionState.isSub())

const messagesStore = useMessagesStore()
function sendEmoji(emoji: string) {
  messagesStore.sendEmojiToChannel({ channel: `g-${props.miscState.gameID}`, emoji })
  emit('close')
}
</script>
