<template>
  <div style="display: flex; overflow-x: auto; min-width: 20px; min-height: 20px">
    <InputGroup v-if="emojiListEditing">
      <InputText
        v-model="newEmoji"
        style="width: 40px"
      />
      <Button
        icon="pi pi-plus"
        severity="success"
        :disabled="!validNewEmoji"
        @click="addEmoji"
      />
    </InputGroup>
    <div
      v-for="(emoji, i) in emojiList"
      :key="`EmojiList${i}`"
      style="font-size: 2rem; display: flex; align-items: center"
      class="emojiContainer"
    >
      <Button
        v-if="emojiListEditing"
        icon="pi pi-arrow-left"
        text
        rounded
        size="small"
        style="margin-right: -15px"
        @click="swapEmojis(i, -1)"
      />
      <div style="position: relative">
        <div
          :class="{ clickable: !emojiListEditing }"
          @click="sendEmoji(emoji)"
        >
          {{ emoji }}
        </div>
        <Button
          v-if="emojiListEditing"
          icon="pi pi-times"
          class="emojiDeleteButton"
          rounded
          severity="danger"
          size="small"
          @click="emojiList.splice(i, 1)"
        />
      </div>
      <Button
        v-if="emojiListEditing"
        icon="pi pi-arrow-right"
        text
        rounded
        size="small"
        style="margin-left: -15px"
        @click="swapEmojis(i, 1)"
      />
    </div>
    <Button
      :icon="`pi pi-${emojiListEditing ? 'check' : 'pencil'}`"
      text
      rounded
      :severity="emojiListEditing ? 'success' : 'primary'"
      size="small"
      style="position: absolute; right: -6px; top: -6px"
      @click="emojiListEditing = !emojiListEditing"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'

import type { MiscStateType } from '@/services/compositionGame/useMisc'
import { computed, ref } from 'vue'
import { isEmoji, useMessagesStore } from '@/store/messages'
import { useStorage } from '@vueuse/core'

const props = defineProps<{ miscState: MiscStateType }>()
const emit = defineEmits<{ close: [] }>()

const messagesStore = useMessagesStore()
function sendEmoji(emoji: string) {
  if (emojiListEditing.value) {
    return
  }
  messagesStore.sendEmojiToChannel({ channel: `g-${props.miscState.gameID}`, emoji })
  emit('close')
}

const emojiListEditing = ref(false)
const emojiList = useStorage('TWB-EmojisInGame', ['👋', '😁', '🥰', '😜', '😭', '🥱', '💩'], localStorage)

const newEmoji = ref('')
const validNewEmoji = computed(() => {
  return isEmoji(newEmoji.value) && !emojiList.value.includes(newEmoji.value)
})
function addEmoji() {
  if (validNewEmoji.value) {
    emojiList.value = [newEmoji.value].concat(emojiList.value)
  }
  newEmoji.value = ''
}
function swapEmojis(index: number, direction: number) {
  const secondIndex = index + direction
  if (secondIndex >= 0 && secondIndex < emojiList.value.length) {
    ;[emojiList.value[index], emojiList.value[secondIndex]] = [emojiList.value[secondIndex], emojiList.value[index]]
  }
}
</script>

<style scoped>
.emojiContainer {
  position: relative;
}

.emojiDeleteButton {
  position: absolute;
  top: 0;
  right: 5px;
  height: 15px !important;
  width: 15px !important;
  padding: 0;
}
</style>
