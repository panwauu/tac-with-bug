<template>
  <h2>{{ t('Tournament.Overview.header') }}</h2>
  <Accordion :active-index="0">
    <AccordionTab :header="t('Tournament.Overview.tournaments')">
      <TournamentsTable />
    </AccordionTab>
    <AccordionTab :header="t('Tournament.Overview.createPrivate')">
      <CreatePrivateTournament />
    </AccordionTab>
  </Accordion>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import CreatePrivateTournament from '@/components/Tournament/CreatePrivateTournament.vue'
import TournamentsTable from '@/components/Tournament/TournamentsTable.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
