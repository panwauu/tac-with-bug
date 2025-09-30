<template>
  <div class="chartNextToEachOtherContainer">
    <ProfileRadar
      :username="username"
      :data="playerStats.table"
      :my-data="myStats.table"
      class="chartNextToEachOther"
    />
    <UserGamesDougnut
      :data="playerStats.gamesDistribution"
      :username="username"
      class="chartNextToEachOther"
      style="padding: 0 20px"
    />
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue'
import UserGamesDougnut from '@/components/UserGamesDougnut.vue'
import type { PlayerFrontendStatistic } from '@/generatedClient'

defineProps<{ username: string; playerStats: PlayerFrontendStatistic; myStats: PlayerFrontendStatistic }>()
</script>

<style scoped>
.chartNextToEachOtherContainer {
  display: flex;
  flex-wrap: wrap;
  position: relative;
}

.chartNextToEachOther {
  flex: 1 1 200px;
  min-width: 0;
}
</style>
