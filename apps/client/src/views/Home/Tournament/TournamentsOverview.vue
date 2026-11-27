<template>
  <h2>{{ t('Tournament.Overview.header') }}</h2>
  <Accordion :value="0">
    <AccordionPanel :value="0">
      <AccordionHeader>{{ t('Tournament.Overview.tournaments') }}</AccordionHeader>
      <AccordionContent>
        <TournamentsTable />
      </AccordionContent>
    </AccordionPanel>
    <AccordionPanel :value="1">
      <AccordionHeader>{{ t('Tournament.Overview.createPrivate') }}</AccordionHeader>
      <AccordionContent>
        <CreatePrivateTournament />
      </AccordionContent>
    </AccordionPanel>
    <AccordionPanel
      v-if="moderationStore.admin"
      :value="2"
    >
      <AccordionHeader>{{ t('Tournament.Overview.createPublic') }}</AccordionHeader>
      <AccordionContent>
        <CreatePublicTournament />
      </AccordionContent>
    </AccordionPanel>
  </Accordion>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import CreatePrivateTournament from '@/components/Tournament/CreatePrivateTournament.vue'
import TournamentsTable from '@/components/Tournament/TournamentsTable.vue'
import CreatePublicTournament from '@/components/Tournament/CreatePublicTournament.vue'
import { useI18n } from 'vue-i18n'
import { useModerationStore } from '@/store/moderation'

const { t } = useI18n()
const moderationStore = useModerationStore()
</script>
