<template>
  <div>
    <DataTable :value="tournamentParticipations" :loading="loading">
      <Column field="title" :header="$t('Profile.TournamentParticipations.tournamentTitle')" />
      <Column :header="$t('Profile.TournamentParticipations.tournamentResult')">
        <template #body="slotProps">
          <div v-if="slotProps.data.placement != null">
            <div style="width: 35px;">
              <Crown :rank="slotProps.data.placement" />
            </div>
          </div>
          <div v-else>
            <div class="roundsBatch">{{ slotProps.data.exitRound }}/{{ slotProps.data.totalRounds }}</div>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Crown from '@/components/icons/CrownSymbol.vue';

import { watch, ref } from 'vue';
import { DefaultService as Service } from '@/generatedClient';
import { tournamentParticipation } from '@/../../shared/types/typesTournament';
import router from '@/router';

const props = defineProps<{ username: string }>();

const loading = ref(false)
const tournamentParticipations = ref<tournamentParticipation[]>([])

updateData()
watch(() => props.username, () => updateData())

async function updateData() {
  try {
    loading.value = true
    tournamentParticipations.value = await Service.getUserTournamentParticipations(props.username)
    loading.value = false
  } catch (err) {
    console.log(err);
    router.push({ name: 'Landing' });
  }
}
</script>

<style scoped>
.roundsBatch {
  font-weight: 700;
  border: 2px solid var(--text-color);
  border-radius: 3px;
  display: inline-block;
  background-color: var(--primary-color);
  color: var(--primary-color-text);
}
</style>
