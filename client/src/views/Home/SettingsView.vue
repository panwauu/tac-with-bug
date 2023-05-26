<template>
  <div class="p-card settingsPage">
    <Accordion v-model:activeIndex="activeIndex">
      <AccordionTab
        :header="$t('Settings.ChangeUsername.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsUsernameUpdate @settingoperationdone="activeIndex = undefined" />
      </AccordionTab>
      <AccordionTab
        :header="$t('Settings.ChangeMail.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsMailUpdate @settingoperationdone="activeIndex = undefined" />
      </AccordionTab>
      <AccordionTab
        :header="$t('Settings.ChangePassword.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsPasswordUpdate @settingoperationdone="activeIndex = undefined" />
      </AccordionTab>
      <AccordionTab
        :header="$t('Settings.UploadProfilePicture.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsProfilePicture @settingoperationdone="activeIndex = undefined" />
      </AccordionTab>
      <AccordionTab
        :header="$t('Settings.DeleteProfile.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsDeleteUser @settingoperationdone="activeIndex = undefined" />
      </AccordionTab>
      <AccordionTab :header="$t('Settings.Language.header')">
        <LanguagePicker :uploadFlag="isLoggedIn" />
      </AccordionTab>
      <AccordionTab :header="$t('Settings.Audio.header')">
        <SettingsAudioVolume />
      </AccordionTab>
      <AccordionTab
        :header="$t('Settings.EmailNotifiactions.header')"
        :disabled="!isLoggedIn"
      >
        <SettingsEmailNotification v-if="isLoggedIn" />
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'

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

const activeIndex = ref<number | undefined>()
</script>

<style scoped>
.settingsPage {
  flex: 0 1 800px;
  max-width: 100%;
}
</style>
