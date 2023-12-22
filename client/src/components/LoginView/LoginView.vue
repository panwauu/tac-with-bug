<template>
  <div>
    <Message
      v-if="displayUnactivatedMessage"
      severity="error"
      :sticky="true"
    >
      <div>
        {{ $t(`Login.SignIn.errorMsgEmail`) }}
        <a
          href="#"
          @click="newActivationMessage()"
        >
          {{ $t('Login.SignIn.errorMsgEmailLink') }}
        </a>
      </div>
    </Message>
    <form @submit.prevent="login">
      <span class="p-float-label floatingTextInput loginInputElement">
        <InputText
          id="LIusername"
          v-model="username"
          type="text"
          name="username"
          style="width: 100%"
        />
        <label for="LIusername">{{ $t('Login.username') }}</label>
      </span>
      <span class="p-float-label floatingTextInput loginInputElement">
        <InputText
          id="LIpassword"
          v-model="password"
          type="password"
          name="password"
          style="width: 100%"
        />
        <label for="LIpassword">{{ $t('Login.password') }}</label>
      </span>
      <Button
        type="submit"
        :icon="'pi ' + (loading ? 'pi-spin pi-spinner' : 'pi-sign-in')"
        :label="$t('Login.signIn')"
        class="loginInputElement loginButton"
        :disabled="password === '' || username === '' || loading"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'

import { ref } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index'
import { login as userLogin } from '@/services/useUser'
import { useToast } from 'primevue/usetoast'
import { i18n } from '@/services/i18n'
import router from '@/router'
import { injectStrict, SocketKey } from '@/services/injections'

import { useSettingsStore } from '@/store/settings'
import { deleteProfilePics } from '@/services/useProfilePicture'
const settingsStore = useSettingsStore()

const socket = injectStrict(SocketKey)
const toast = useToast()

const emit = defineEmits<{ login: [] }>()

const username = ref('')
const password = ref('')
const loading = ref(false)
const displayUnactivatedMessage = ref(false)

async function login() {
  loading.value = true

  try {
    const credentials = {
      username: username.value,
      password: password.value,
    }
    const response = await Service.loginUser(credentials)
    const socketRes = await socket.emitWithAck(1000, 'login', { token: response.token })
    if (socketRes.error != null) {
      throw new Error('Could not login Socket')
    }

    (socket.auth as any).token = response.token
    userLogin({ token: response.token, username: response.username })
    deleteProfilePics()
    settingsStore.setColorblind(response.colorBlindnessFlag, false)
    settingsStore.setDefaultPositions(response.gameDefaultPositions as [number, number], false)
    settingsStore.setAdmin(response.admin)
    router.push({
      name: router.currentRoute.value.name != null ? router.currentRoute.value.name.toString() : 'Landing',
      query: router.currentRoute.value.query,
      params: { ...router.currentRoute.value.params, locale: response.locale },
    })
    emit('login')
  } catch (error: any) {
    if (error?.body?.error === 'email') {
      displayUnactivatedMessage.value = true
      return
    }

    let errorMsg = 'errorMsg'
    if (error?.body?.error === 'user') {
      errorMsg += 'User'
    } else if (error?.body?.error === 'password') {
      errorMsg += 'Password'
    }

    toast.add({
      severity: 'error',
      summary: i18n.global.t('Login.SignIn.errorHeader'),
      detail: i18n.global.t(`Login.SignIn.${errorMsg}`),
      life: 2500,
    })
  } finally {
    loading.value = false
  }
}

function newActivationMessage() {
  displayUnactivatedMessage.value = false
  Service.requestNewActivationMail(username.value)
  toast.add({
    severity: 'success',
    summary: i18n.global.t('Login.SignIn.newActivationSummary'),
    detail: i18n.global.t('Login.SignIn.newActivationDetail'),
    life: 5000,
  })
}
</script>

<style scoped>
.loginButton {
  margin-top: 30px;
}
</style>
