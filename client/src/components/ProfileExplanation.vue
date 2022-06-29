<template>
  <Button
    aria-label="Explanation"
    icon="pi pi-question"
    class="p-button-rounded p-button-sm p-button-text p-button-secondary buttonExplanation"
    @click="displayExplanation = true"
  />
  <Dialog
    v-model:visible="displayExplanation"
    :header="$t('Profile.expHeader')"
    :modal="true"
    :dismissableMask="true"
  >
    <table>
      <tr>
        <td>{{ $t("Profile.mostFrequent") + ":" }}</td>
        <td>{{ $t("Profile.mostFrequentExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.bestPlayer") + ":" }}</td>
        <td>{{ $t("Profile.bestPlayerExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.worstPlayer") + ":" }}</td>
        <td>{{ $t("Profile.worstPlayerExp") }}</td>
      </tr>
      <tr>
        <td>
          <GamesHistoryBadge :win="'won'" style="margin: 2px auto" />
        </td>
        <td>{{ $t("Profile.wIconExp") }}</td>
      </tr>
      <tr>
        <td>
          <GamesHistoryBadge :win="'lost'" style="margin: 2px auto" />
        </td>
        <td>{{ $t("Profile.lIconExp") }}</td>
      </tr>
      <tr>
        <td>
          <GamesHistoryBadge :win="'coop'" style="margin: 2px auto" />
        </td>
        <td>{{ $t("Profile.tIconExp") }}</td>
      </tr>
      <tr>
        <td>
          <GamesHistoryBadge :win="'aborted'" style="margin: 2px auto" />
        </td>
        <td>{{ $t("Profile.aIconExp") }}</td>
      </tr>
      <tr>
        <td>
          <GamesHistoryBadge :win="'running'" style="margin: 2px auto" />
        </td>
        <td>{{ $t("Profile.rIconExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.success") + ":" }}</td>
        <td>{{ $t("Profile.successExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.generosity") + ":" }}</td>
        <td>{{ $t("Profile.generosityExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.aggression") + ":" }}</td>
        <td>{{ $t("Profile.aggressionExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.decision") + ":" }}</td>
        <td>{{ $t("Profile.decisionExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.resentment") + ":" }}</td>
        <td>{{ $t("Profile.resentmentExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.usage") + ":" }}</td>
        <td>{{ $t("Profile.usageExp") }}</td>
      </tr>
      <tr>
        <td>{{ $t("Profile.abortionrate") + ":" }}</td>
        <td>{{ $t("Profile.abortionrateExp") }}</td>
      </tr>
    </table>
  </Dialog>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import GamesHistoryBadge from '@/components/icons/GamesHistoryBadge.vue';

import { ref } from 'vue';
let displayExplanation = ref(false)
</script>

<style scoped>
table,
th,
td {
  border: 1px solid var(--surface-d);
  border-collapse: collapse;
}

th,
td {
  padding: 5px;
}

.buttonExplanation {
  position: absolute;
  right: 10px;
  top: 10px;
}
</style>
