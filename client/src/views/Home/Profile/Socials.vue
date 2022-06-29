<template>
  <div class="graphContainer">
    <NetworkUserGraph
      :networkData="networkData"
      :username="username"
      :peopleData="peopleData"
      :loading="loading"
      style="width: 100%"
    />
  </div>
</template>

<script setup lang="ts">
import NetworkUserGraph from '@/components/NetworkUserGraph.vue';
import { ref, watch } from 'vue';
import { Service } from '@/generatedClient';
import router from '@/router/index';

const props = defineProps<{ username: string }>();

const loading = ref(true)
const networkData = ref({ edges: [] as any[], nodes: [] as any[] })
const peopleData = ref({})

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