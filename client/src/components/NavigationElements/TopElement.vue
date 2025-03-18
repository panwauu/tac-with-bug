<template>
  <div class="p-menubar topMenu">
    <div
      class="navLogo"
      @click="redirectToLanding()"
    >
      <div class="tacLogoLarge">
        <TwbSymbol
          style="height: 100%"
          side="left"
        />
        <div class="twbLetters logoLetters">TWB</div>
        <TwbSymbol
          style="height: 100%"
          side="right"
        />
      </div>
    </div>
    <div style="display: flex; align-items: center; height: 30px">
      <LoginButton />
      <template v-if="username != null">
        <PlayerWithPicture :username="username" />
        <OverlayBadge
          v-if="friendsState.numberOpenRequests !== 0"
          severity="danger"
          :value="friendsState.numberOpenRequests"
          size="small"
        >
          <i
            class="pi pi-user"
            style="font-size: 1.4rem; margin-right: 5px; cursor: pointer"
            @click="router.push({ name: 'Profile-Friends', params: { username: username, locale: router.currentRoute.value.params.locale } })"
          />
        </OverlayBadge>
      </template>
      <NavigationElement @logout="$emit('logout')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TwbSymbol from '@/components/icons/TwbSymbol.vue'
import LoginButton from './LoginButton.vue'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import NavigationElement from './NavigationElement.vue'
import OverlayBadge from 'primevue/overlaybadge'

import router from '@/router/index'
import { username } from '@/services/useUser'
import { FriendsStateKey, injectStrict } from '@/services/injections'

defineEmits<{ logout: [] }>()

const friendsState = injectStrict(FriendsStateKey)

function redirectToLanding() {
  router.push({ name: 'Landing' })
}
</script>

<style scoped>
.topMenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 48px;
}

.navLogo {
  height: 30px;
  cursor: pointer;
}

.tacLogoLarge {
  height: 100%;
  display: flex;
}

.logoLetters {
  font-family: 'tacfontregular', Monospace;
  font-size: 38px;
  color: var(--tac-text-color);
  user-select: none;
}
</style>
