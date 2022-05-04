<template>
  <AutoComplete
    v-model="localUsername"
    forceSelection
    :suggestions="filteredPlayers"
    field="username"
    appendTo="body"
    :inputStyle="'width: 100%;'"
    :placeholder="$t('PlayersAutoComplete.placeholder')"
    @complete="searchPlayers()"
  >
    <template #item="slotProps">
      <PlayerWithPicture :nameFirst="false" :clickable="false" :username="slotProps.item.username" />
    </template>
  </AutoComplete>
</template>

<script setup lang="ts">
import PlayerWithPicture from './PlayerWithPicture.vue';
import AutoComplete from 'primevue/autocomplete';

import { computed, ref } from 'vue';
import { Service } from '@/generatedClient/index';

const props = defineProps<{ username: string | null, userid: number | null, playersToAvoid?: string[] }>();
const emit = defineEmits(['update:username', 'update:userid'])

let filteredPlayers = ref<{ username: string, id: number }[]>([]);

const localUsername = computed({
  get(): string {
    return props.username ?? '';
  },
  set(value: string): void {
    if (value == null) { return }
    if (typeof value === 'string') { return emit('update:username', value) }
    else {
      emit('update:userid', (value as any).id)
      return emit('update:username', (value as any).username)
    }
  },
})

function searchPlayers() {
  Service.searchPlayers(localUsername.value, 10).then((res) => {
    filteredPlayers.value = res.filter((v) => props.playersToAvoid == null || !props.playersToAvoid.includes(v.username));
  });
}
</script>

<style scoped>
</style>