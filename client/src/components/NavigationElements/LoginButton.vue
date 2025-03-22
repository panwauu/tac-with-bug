<template>
  <Button
    v-if="username === null"
    id="topElementLoginButton"
    :label="'Login'"
    icon="pi pi-sign-in"
    icon-pos="right"
    class="p-button-sm"
    @click="toggle"
  />
  <Popover
    ref="loginOverlayRef"
    append-to="body"
    :show-close-icon="true"
    :breakpoints="{ '640px': '100vw' }"
    :style="{ width: '450px' }"
    :base-z-index="1000"
  >
    <Tabs value="0">
      <TabList>
        <Tab value="0">{{ t('Login.signIn') }}</Tab>
        <Tab value="1">{{ t('Login.signUp') }}</Tab>
        <Tab value="2">{{ t('Login.password') }}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="0">
          <LoginView @login="login" />
        </TabPanel>
        <TabPanel value="1">
          <SignUp />
        </TabPanel>
        <TabPanel value="2">
          <NewPassword />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Popover>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import LoginView from '../LoginView/LoginView.vue'
import SignUp from '../LoginView/SignUp.vue'
import NewPassword from '../LoginView/NewPassword.vue'

import { ref } from 'vue'
import { username } from '@/services/useUser'

const loginOverlayRef = ref<Popover | null>(null)
function toggle(event: any) {
  loginOverlayRef.value?.toggle(event)
}

function login() {
  loginOverlayRef.value?.hide()
}
</script>
