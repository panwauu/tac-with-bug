<template>
  <div>
    <div>{{ t('Settings.InGameEmojis.explanation') }}</div>
    <div
      v-if="!subscriptionState.isSub()"
      class="emojiHinweis"
    >
      <span>{{ t('Settings.InGameEmojis.onlySubscribers') }}</span>
      <Button
        :label="t('Settings.InGameEmojis.toSubscription')"
        size="small"
        @click="router.push({ name: 'Subscription' })"
      />
    </div>
    <div class="emojiReihe">
      <div
        v-for="(emoji, i) in liste"
        :key="`SettingsEmoji${i}`"
        class="emojiContainer"
      >
        <Button
          v-if="darf"
          icon="pi pi-arrow-left"
          text
          rounded
          size="small"
          :disabled="i === 0"
          :aria-label="t('Settings.InGameEmojis.moveLeft')"
          @click="tausche(i, -1)"
        />
        <span class="emoji">{{ emoji }}</span>
        <Button
          v-if="darf"
          icon="pi pi-times"
          class="emojiDeleteButton"
          rounded
          severity="danger"
          size="small"
          :disabled="liste.length <= 1"
          :aria-label="t('Settings.InGameEmojis.remove')"
          @click="eigeneEmojis.splice(i, 1)"
        />
      </div>
    </div>
    <InputGroup
      v-if="darf"
      class="emojiNeu"
    >
      <InputText
        v-model="neu"
        :placeholder="t('Settings.InGameEmojis.add')"
        style="max-width: 160px"
        @keyup.enter="hinzu"
      />
      <Button
        icon="pi pi-plus"
        severity="success"
        :disabled="!neuGueltig"
        :aria-label="t('Settings.InGameEmojis.add')"
        @click="hinzu"
      />
      <Button
        :label="t('Settings.InGameEmojis.reset')"
        severity="secondary"
        @click="eigeneEmojis = [...STANDARD_EMOJIS]"
      />
    </InputGroup>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { isEmoji } from '@/store/messages'
import { injectStrict, SocketKey } from '@/services/injections'
import { useSubscription } from '@/services/useSubscription'
import { MAX_EMOJIS, STANDARD_EMOJIS, useInGameEmojis } from '@/services/useInGameEmojis'

const { t } = useI18n()
const router = useRouter()
const socket = injectStrict(SocketKey)
const subscriptionState = useSubscription(socket)
const { eigeneEmojis, aktiv } = useInGameEmojis(() => subscriptionState.isSub())

const darf = computed(() => subscriptionState.isSub())
const liste = computed(() => (darf.value ? eigeneEmojis.value : aktiv.value))

const neu = ref('')
const neuGueltig = computed(() => isEmoji(neu.value) && !eigeneEmojis.value.includes(neu.value) && eigeneEmojis.value.length < MAX_EMOJIS)
function hinzu() {
  if (neuGueltig.value) eigeneEmojis.value = eigeneEmojis.value.concat(neu.value)
  neu.value = ''
}
function tausche(i: number, richtung: number) {
  const j = i + richtung
  if (j < 0 || j >= eigeneEmojis.value.length) return
  const l = [...eigeneEmojis.value]
  ;[l[i], l[j]] = [l[j], l[i]]
  eigeneEmojis.value = l
}
</script>

<style scoped>
.emojiHinweis {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.emojiReihe {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.75rem;
}
.emojiContainer {
  position: relative;
  display: flex;
  align-items: center;
}
.emoji {
  font-size: 2rem;
}
.emojiDeleteButton {
  position: absolute;
  top: 0;
  right: -4px;
  height: 15px !important;
  width: 15px !important;
  padding: 0;
}
.emojiNeu {
  margin-top: 0.75rem;
}
</style>
