<template>
  <div class="chartNextToEachOtherContainer">
    <ProfileRadar
      :username="username"
      :showSponsorOverlay="showSponsorOverlay"
      :data="radarData"
      class="chartNextToEachOther"
    />
    <UserGamesDougnut
      :data="gamesDistributionData"
      :username="username"
      :showSponsorOverlay="showSponsorOverlay"
      class="chartNextToEachOther"
      style="padding: 0 20px"
    />
  </div>
</template>

<script setup lang="ts">
import ProfileRadar from '@/components/ProfileRadar.vue';
import UserGamesDougnut from '@/components/UserGamesDougnut.vue';

import type { gamesDistributionData } from '@/../../shared/types/typesPlayerStatistic';
import { computed } from 'vue';
import { injectStrict, SubscriptionStateKey } from '@/services/injections';
import { username as loggedInUsername } from '@/services/useUser';

const subscriptionState = injectStrict(SubscriptionStateKey)
const props = defineProps<{ username: string, radarData: number[], gamesDistributionData: gamesDistributionData }>();

const showSponsorOverlay = computed(() => {
  return props.username != loggedInUsername.value && !subscriptionState.isSub()
})
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