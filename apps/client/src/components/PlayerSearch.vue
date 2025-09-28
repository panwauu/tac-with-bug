<template>
  <InputGroup>
    <AutoComplete
      ref="PlayerSearchInputRef"
      v-model="selectedPlayer"
      aria-label="Playersearch"
      :suggestions="filteredPlayers"
      append-to="body"
      :placeholder="t('Home.Spielersuche')"
      :emptySearchMessage="t('PlayerSearch.noResults')"
      @complete="searchPlayers()"
      @option-select="searchSubmit()"
      @dropdown-click="searchSubmit()"
      @keyup.enter="searchSubmit()"
    />
    <Button
      ref="PlayerSearchButtonRef"
      aria-label="Player Search Submit"
      icon="pi pi-search"
      @click="searchSubmit()"
    />
  </InputGroup>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import AutoComplete from 'primevue/autocomplete'
import InputGroup from 'primevue/inputgroup'

import { DefaultService as Service } from '@/generatedClient/index.ts'
import { ref } from 'vue'
import router from '@/router/index'

const { t } = useI18n()

const selectedPlayer = ref<string>('')
const filteredPlayers = ref<string[]>([])
const PlayerSearchButtonRef = ref<any | null>(null)
const PlayerSearchInputRef = ref<any | null>(null)

const searchPlayers = () => {
  Service.searchPlayers(selectedPlayer.value, 4).then((d) => (filteredPlayers.value = d.map((e) => e.username)))
}

const searchSubmit = () => {
  const player = filteredPlayers.value.find((n) => n.toLowerCase() === selectedPlayer.value.toLowerCase())
  if (player) {
    router.push({
      name: 'Profile',
      params: { username: player, locale: router.currentRoute.value.params.locale },
    })
  }
  selectedPlayer.value = ''
}
</script>
