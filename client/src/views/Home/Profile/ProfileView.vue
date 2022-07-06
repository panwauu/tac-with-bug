<template>
  <div class="chartNextToEachOtherContainer">
    <ProfileRadar
      :username="username"
      :data="radarData"
      class="chartNextToEachOther"
    />
    <UserGamesDougnut
      :data="gamesDistributionData"
      :username="username"
      class="chartNextToEachOther"
      style="padding: 0 20px"
    />
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue'
import UserGamesDougnut from '@/components/UserGamesDougnut.vue'

import type { gamesDistributionData } from '@/../../server/src/sharedTypes/typesPlayerStatistic'

defineProps<{ username: string; radarData: number[]; gamesDistributionData: gamesDistributionData }>()
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
