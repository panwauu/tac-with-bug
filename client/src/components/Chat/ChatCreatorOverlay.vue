<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <SelectButton
      v-model="chatOptionSelected"
      :options="chatOptions"
      option-label="value"
    >
      <template #option="slotProps">
        <div style="display: flex; align-items: center">
          <i
            :class="slotProps.option.icon"
            style="margin-right: 5px"
            aria-hidden="true"
          />
          <div>{{ t(`Chat.ChatCreator.${slotProps.option.value}`) }}</div>
        </div>
      </template>
    </SelectButton>

    <PlayersAutoComplete
      v-model:username="selectedPlayerUsername"
      v-model:userid="selectedPlayerUserid"
      style="margin: 10px"
      :players-to-avoid="username == null ? [] : [username]"
    />
    <Button
      :label="t('Chat.ChatCreator.startButton')"
      :disabled="selectedPlayerUsername == '' || selectedPlayerUsername == null || chatOptionSelected == null"
      @click="startChat"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import PlayersAutoComplete from '../PlayersAutoComplete.vue'

import { ref } from 'vue'
import { username } from '@/services/useUser'
import { useMessagesStore } from '@/store/messages'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emits = defineEmits<{ close: [] }>()

const messagesStore = useMessagesStore()

const selectedPlayerUsername = ref('')
const selectedPlayerUserid = ref(null)

const chatOptions = ref([
  { icon: 'pi pi-comment', value: 'single' },
  { icon: 'pi pi-comments', value: 'group' },
])
const chatOptionSelected = ref(chatOptions.value[0])

function startChat() {
  if (selectedPlayerUserid.value == null || selectedPlayerUserid.value < 0 || selectedPlayerUsername.value === '') {
    console.error('id or username not valid')
    return
  }
  messagesStore.startChat([{ id: selectedPlayerUserid.value, username: selectedPlayerUsername.value }], chatOptionSelected.value?.value === 'group' ? 'Neuer Chat' : null)
  chatOptionSelected.value = chatOptions.value[0]
  selectedPlayerUsername.value = ''
  selectedPlayerUserid.value = null
  emits('close')
}
</script>
