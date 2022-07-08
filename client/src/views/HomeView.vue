<template>
  <div id="home">
    <TopElement @logout="logout()" />
    <div class="scroll">
      <div class="homeContainer">
        <div class="home">
          <router-view />
        </div>
        <BottomElement />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TopElement from '@/components/NavigationElements/TopElement.vue'
import BottomElement from '@/components/NavigationElements/BottomElement.vue'

import { injectStrict, SocketKey } from '@/services/injections'
import { logout as logoutUser, isLoggedIn } from '@/services/useUser'
const socket = injectStrict(SocketKey)

if (!isLoggedIn.value) {
  logout()
}

async function logout() {
  await logoutUser(socket)
}
</script>

<style scoped>
#home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.scroll {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}

.homeContainer {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  min-height: 100%;
}

.home {
  margin: 30px 0;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
</style>
