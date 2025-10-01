<template>
  <div class="graphContainer">
    <NetworkUserGraph
      :username="username"
      :player-stats="props.playerStats"
      style="width: 100%"
    />
  </div>
</template>

<script setup lang="ts">
import NetworkUserGraph from '@/components/NetworkUserGraph.vue'
import { type PlayerFrontendStatistic } from '@/generatedClient/index.ts'

const props = defineProps<{ username: string; playerStats: PlayerFrontendStatistic }>()
</script>
