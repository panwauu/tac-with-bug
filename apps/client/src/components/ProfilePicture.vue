<template>
  <div class="profilePictureContainer">
    <img
      alt="Profilbild"
      class="profilePicture"
      :src="srcImage"
    />
    <div
      v-if="showCrown && getCrown(username) != null"
      class="crown"
    >
      <Crown :rank="getCrown(username) ?? 1" />
    </div>
    <Badge
      v-if="online != null"
      class="onlineIndicator"
      :severity="online ? 'success' : 'danger'"
    />
  </div>
</template>

<script setup lang="ts">
import AvatarDummy from '../assets/avatar-dummy.png'

import Badge from 'primevue/badge'
import Crown from '@/components/icons/CrownSymbol.vue'

import { watch, computed } from 'vue'
import { getProfilePicSrc, requestProfilePic } from '../services/useProfilePicture'
import { getCrown } from '../services/useTournamentWinners'
import { username as loggedInUsername } from '@/services/useUser'

const props = withDefaults(
  defineProps<{
    username: string
    showCrown?: boolean
    online?: boolean
  }>(),
  {
    showCrown: true,
    online: undefined,
  }
)

requestProfilePic(props.username).catch((err) => console.log(err))
watch(
  () => props.username,
  () => {
    requestProfilePic(props.username).catch((err) => console.log(err))
  }
)
watch(
  () => loggedInUsername.value,
  () => {
    requestProfilePic(props.username).catch((err) => console.log(err))
  }
)

const srcImage = computed(() => {
  return getProfilePicSrc(props.username) ?? AvatarDummy
})
</script>

<style scoped>
.profilePictureContainer {
  position: relative;
}

.profilePicture {
  border-radius: inherit;
  width: 100%;
  object-fit: contain;
}

.crown {
  width: 85%;
  position: absolute;
  left: 47.5%;
  top: -31%;
  transform: rotate(37deg);
}

.onlineIndicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 25%;
  min-width: 25%;
  height: 0;
  padding: 25% 0 0 0;
  border-radius: 50%;
}
</style>
