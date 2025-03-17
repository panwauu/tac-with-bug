<template>
  <div class="p-inputgroup">
    <AutoComplete
      ref="PlayerSearchInputRef"
      v-model="selectedPlayer"
      aria-label="Playersearch"
      :suggestions="filteredPlayers"
      appendTo="body"
      :placeholder="t('Home.Spielersuche')"
      @complete="searchPlayers()"
      @item-select="searchSubmitFromAutoComplete()"
      @keyup.enter="searchSubmitFromAutoComplete()"
    />
    <Button
      ref="PlayerSearchButtonRef"
      aria-label="Player Search Submit"
      icon="pi pi-search"
      class="p-button"
      @click="searchSubmit()"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import AutoComplete from 'primevue/autocomplete'

import { DefaultService as Service } from '@/generatedClient/index'
import { ref } from 'vue'
import router from '@/router/index'

const selectedPlayer = ref<string>('')
const filteredPlayers = ref<string[]>([])
const PlayerSearchButtonRef = ref<any | null>(null)
const PlayerSearchInputRef = ref<any | null>(null)

const searchPlayers = () => {
  Service.searchPlayers(selectedPlayer.value, 4).then((d) => (filteredPlayers.value = d.map((e) => e.username)))
}

const searchSubmit = () => {
  if (filteredPlayers.value.includes(selectedPlayer.value)) {
    router.push({
      name: 'Profile',
      params: { username: selectedPlayer.value, locale: router.currentRoute.value.params.locale },
    })
  }
  selectedPlayer.value = ''
}

const searchSubmitFromAutoComplete = () => {
  PlayerSearchButtonRef.value?.$el?.click()
  PlayerSearchInputRef.value?.$el?.blur()
  PlayerSearchInputRef.value?.$el?.children?.forEach((child: any) => child.blur())
  setTimeout(() => {
    PlayerSearchInputRef.value?.$el?.blur()
    PlayerSearchInputRef.value?.$el?.children?.forEach((child: any) => child.blur())
  }, 0)
}
</script>
