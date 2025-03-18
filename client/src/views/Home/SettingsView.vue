<template>
  <div class="p-card settingsPage">
    <Accordion v-model:value="activeIndex">
      <AccordionPanel
        :value="0"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.ChangeUsername.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsUsernameUpdate @settingoperationdone="activeIndex = undefined" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel
        :value="1"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.ChangeMail.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsMailUpdate @settingoperationdone="activeIndex = undefined" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel
        :value="2"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.ChangePassword.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsPasswordUpdate @settingoperationdone="activeIndex = undefined" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel
        :value="3"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.UploadProfilePicture.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsProfilePicture @settingoperationdone="activeIndex = undefined" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel
        :value="4"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.DeleteProfile.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsDeleteUser @settingoperationdone="activeIndex = undefined" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel :value="5">
        <AccordionHeader>{{ t('Settings.Language.header') }}</AccordionHeader>
        <AccordionContent>
          <LanguagePicker :upload-flag="isLoggedIn" />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel :value="6">
        <AccordionHeader>{{ t('Settings.Audio.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsAudioVolume />
        </AccordionContent>
      </AccordionPanel>
      <AccordionPanel
        :value="7"
        :disabled="!isLoggedIn"
      >
        <AccordionHeader>{{ t('Settings.EmailNotifiactions.header') }}</AccordionHeader>
        <AccordionContent>
          <SettingsEmailNotification v-if="isLoggedIn" />
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'

import SettingsUsernameUpdate from '@/components/SettingsView/SettingsUsernameUpdate.vue'
import SettingsProfilePicture from '@/components/SettingsView/SettingsProfilePicture.vue'
import SettingsMailUpdate from '@/components/SettingsView/SettingsMailUpdate.vue'
import SettingsPasswordUpdate from '@/components/SettingsView/SettingsPasswordUpdate.vue'
import SettingsDeleteUser from '@/components/SettingsView/SettingsDeleteUser.vue'
import SettingsEmailNotification from '@/components/SettingsView/SettingsEmailNotification.vue'
import LanguagePicker from '@/components/LanguagePicker.vue'
import SettingsAudioVolume from '@/components/SettingsView/SettingsAudioVolume.vue'

import { ref } from 'vue'
import { isLoggedIn } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const activeIndex = ref<number | undefined>()
</script>

<style scoped>
.settingsPage {
  flex: 0 1 800px;
  max-width: 100%;
}
</style>
