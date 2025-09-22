<template>
  <AutoComplete
    v-model="localUsername"
    force-selection
    :suggestions="filteredPlayers"
    option-label="username"
    append-to="body"
    :input-style="{ width: '100%' }"
    :placeholder="t('PlayersAutoComplete.placeholder')"
    @complete="searchPlayers()"
  >
    <template #option="slotProps">
      <PlayerWithPicture
        :name-first="false"
        :clickable="false"
        :username="slotProps.option.username"
      />
    </template>
  </AutoComplete>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import PlayerWithPicture from './PlayerWithPicture.vue'
import AutoComplete from 'primevue/autocomplete'
import { computed, ref } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'

const props = defineProps<{ playersToAvoid?: string[] }>()
const username = defineModel<string | null>('username')
const userid = defineModel<number | null>('userid')

const selectedElement = ref<string>('')
const filteredPlayers = ref<{ username: string; id: number }[]>([])

const localUsername = computed({
  get(): string {
    return username.value ?? ''
  },
  set(value: string | { id: number; username: string }) {
    if (value == null) {
      username.value = null
      userid.value = null
      selectedElement.value = ''
      return
    }

    if (typeof value !== 'string') {
      username.value = value.username
      userid.value = value.id
      selectedElement.value = value.username
      return
    }

    selectedElement.value = value
  },
})

function searchPlayers() {
  Service.searchPlayers(selectedElement.value, 10)
    .then((res) => {
      filteredPlayers.value = res.filter((v) => props.playersToAvoid == null || !props.playersToAvoid.includes(v.username))
    })
    .catch((err) => console.log(err))
}
</script>
