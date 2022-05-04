<template>
  <div class="graphContainer">
    <NetworkUserGraph
      :networkData="networkData"
      :username="username"
      :peopleData="peopleData"
      :showSponsorOverlay="showSponsorOverlay"
      :loading="loading"
      style="width: 100%"
    />
  </div>
</template>

<script setup lang="ts">
import NetworkUserGraph from '@/components/NetworkUserGraph.vue';
import { computed, ref, watch } from 'vue';
import { injectStrict, SubscriptionStateKey } from '@/services/injections';
import { username as loggedInUsername } from '@/services/useUser';
import { Service } from '@/generatedClient';
import router from '@/router/index';

const subscriptionState = injectStrict(SubscriptionStateKey)
const props = defineProps<{ username: string }>();

const showSponsorOverlay = computed(() => {
  return props.username != loggedInUsername.value && !subscriptionState.isSub()
})

let loading = ref(true)
let networkData = ref({ edges: [] as any[], nodes: [] as any[] })
let peopleData = ref({})

updateData()
watch(() => props.username, () => updateData())

async function updateData() {
  try {
    loading.value = true
    const data = await Service.getProfileUserNetwork(props.username)
    networkData.value = data.graph
    peopleData.value = data.people
    loading.value = false
  } catch (err) {
    console.log(err);
    router.push({ name: 'Landing' });
  }
}
</script>

<style scoped>
</style>