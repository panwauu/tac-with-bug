<template>
  <Button
    aria-label="Explanation"
    icon="pi pi-question"
    class="p-button-rounded p-button-sm p-button-text p-button-secondary buttonExplanation"
    @click="displayExplanation = true"
  />
  <Dialog
    v-model:visible="displayExplanation"
    :header="t('Profile.expHeader')"
    :modal="true"
    :dismissable-mask="true"
  >
    <table :aria-label="t('Profile.expHeader')">
      <tbody>
        <tr>
          <th>{{ t('Profile.mostFrequent') + ':' }}</th>
          <td>{{ t('Profile.mostFrequentExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.bestPlayer') + ':' }}</th>
          <td>{{ t('Profile.bestPlayerExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.worstPlayer') + ':' }}</th>
          <td>{{ t('Profile.worstPlayerExp') }}</td>
        </tr>
        <tr>
          <th>
            <GamesHistoryBadge
              :win="'won'"
              style="margin: 2px auto"
            />
          </th>
          <td>{{ t('Profile.wIconExp') }}</td>
        </tr>
        <tr>
          <th>
            <GamesHistoryBadge
              :win="'lost'"
              style="margin: 2px auto"
            />
          </th>
          <td>{{ t('Profile.lIconExp') }}</td>
        </tr>
        <tr>
          <th>
            <GamesHistoryBadge
              :win="'coop'"
              style="margin: 2px auto"
            />
          </th>
          <td>{{ t('Profile.tIconExp') }}</td>
        </tr>
        <tr>
          <th>
            <GamesHistoryBadge
              :win="'aborted'"
              style="margin: 2px auto"
            />
          </th>
          <td>{{ t('Profile.aIconExp') }}</td>
        </tr>
        <tr>
          <th>
            <GamesHistoryBadge
              :win="'running'"
              style="margin: 2px auto"
            />
          </th>
          <td>{{ t('Profile.rIconExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.success') + ':' }}</th>
          <td>{{ t('Profile.successExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.generosity') + ':' }}</th>
          <td>{{ t('Profile.generosityExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.aggression') + ':' }}</th>
          <td>{{ t('Profile.aggressionExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.decision') + ':' }}</th>
          <td>{{ t('Profile.decisionExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.resentment') + ':' }}</th>
          <td>{{ t('Profile.resentmentExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.usage') + ':' }}</th>
          <td>{{ t('Profile.usageExp') }}</td>
        </tr>
        <tr>
          <th>{{ t('Profile.abortionrate') + ':' }}</th>
          <td>{{ t('Profile.abortionrateExp') }}</td>
        </tr>
      </tbody>
    </table>
  </Dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import GamesHistoryBadge from '@/components/icons/GamesHistoryBadge.vue'

import { ref } from 'vue'
const displayExplanation = ref(false)
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
