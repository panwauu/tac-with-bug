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
  <OverlayPanel
    ref="loginOverlayRef"
    append-to="body"
    :show-close-icon="true"
    :breakpoints="{ '640px': '100vw' }"
    :style="{ width: '450px' }"
    :base-z-index="1000"
  >
    <TabView v-model:active-index="activeIndex">
      <TabPanel :header="t('Login.signIn')">
        <LoginView @login="login" />
      </TabPanel>
      <TabPanel :header="t('Login.signUp')">
        <SignUp />
      </TabPanel>
      <TabPanel :header="t('Login.password')">
        <NewPassword />
      </TabPanel>
    </TabView>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import OverlayPanel from 'primevue/overlaypanel'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import LoginView from '../LoginView/LoginView.vue'
import SignUp from '../LoginView/SignUp.vue'
import NewPassword from '../LoginView/NewPassword.vue'

import { ref } from 'vue'
import { username } from '@/services/useUser'

const loginOverlayRef = ref<OverlayPanel | null>(null)
function toggle(event: any) {
  loginOverlayRef.value?.toggle(event)
}

const activeIndex = ref(0)

function login() {
  loginOverlayRef.value?.hide()
}
</script>
