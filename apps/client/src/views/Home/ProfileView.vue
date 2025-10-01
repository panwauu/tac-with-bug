<template>
  <div
    ref="profileContainer"
    class="p-card profilePage"
  >
    <ProfileExplanation />
    <div class="profileInformation">
      <div class="profilePictureContainer">
        <ProfilePicture
          :username="username"
          class="profilePicture"
        />
        <HofBadge
          v-if="playerStats?.hof && playerStats.hof.length > 0"
          class="hofOverPicture"
        />
      </div>
      <div class="userInfos">
        <h1>{{ username }}</h1>
        <ProfileDescriptionText
          :value="playerStats?.userDescription ?? ''"
          :username="username"
        />
        <p class="registered">{{ t('Profile.registeredOn') }} {{ new Date(playerStats?.registered ?? 0).toLocaleDateString() }}</p>
        <BlockedByModerationMessage
          v-if="playerStats?.blockedByModerationUntil != null"
          :blocked-by-moderation-until="playerStats.blockedByModerationUntil"
          :second-person="true"
        />
        <FriendButton
          v-if="isLoggedIn"
          :username="username"
        />
      </div>
    </div>
    <Tabs v-model:value="tabValueToName">
      <TabList>
        <Tab
          v-for="tab in items"
          :key="tab.to.name"
          :value="tab.to.name"
        >
          <i :class="tab.icon" />
          <span>{{ tab.label }}</span>
        </Tab>
      </TabList>
    </Tabs>
    <router-view
      v-if="!loading"
      style="padding-top: 15px"
      :player-stats="playerStats"
      :my-stats="myStats"
      :radar-data="playerStats?.table ?? []"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import type { MenuItem } from 'primevue/menuitem'
import FriendButton from '@/components/FriendButton.vue'
import ProfilePicture from '@/components/ProfilePicture.vue'
import ProfileExplanation from '@/components/ProfileExplanation.vue'
import HofBadge from '@/components/icons/HofBadge.vue'

import { watch, ref, computed } from 'vue'
import { type PlayerFrontendStatistic, DefaultService as Service } from '@/generatedClient/index.ts'
import router from '@/router/index'
import ProfileDescriptionText from '@/components/ProfileDescriptionText.vue'
import { useResizeObserver } from '@vueuse/core'
import BlockedByModerationMessage from '@/components/BlockedByModerationMessage.vue'
import { isLoggedIn, username as loggedInUsername } from '@/services/useUser'

const { t } = useI18n()

const props = defineProps<{ username: string }>()

const items = ref(createMenu(true))
const profileContainer = ref<null | HTMLElement>(null)

const playerStats = ref<PlayerFrontendStatistic | null>(null)
const myStats = ref<PlayerFrontendStatistic | null>(null)

updateData()
watch(
  () => props.username,
  () => updateData()
)

async function updateData() {
  try {
    playerStats.value = null
    const usernameStats = await Service.getPlayerStats(props.username)
    playerStats.value = usernameStats
  } catch (err) {
    console.log(err)
    router.push({ name: 'Landing' })
  }
}

loadMyStats()
watch(loggedInUsername, () => loadMyStats())

async function loadMyStats() {
  try {
    myStats.value = null
    if (loggedInUsername.value != null) {
      const myUsernameStats = await Service.getPlayerStats(loggedInUsername.value)
      myStats.value = myUsernameStats
    }
  } catch (err) {
    console.log(err)
  }
}

function createMenu(displayText: boolean): MenuItem[] {
  return [
    {
      label: displayText ? t('Profile.menuOverview') : '',
      icon: 'pi pi-fw pi-home',
      to: { name: 'Profile' },
    },
    {
      label: displayText ? t('Profile.menuAchievements') : '',
      icon: 'pi pi-fw pi-flag',
      to: { name: 'Profile-Achievements' },
    },

    {
      label: displayText ? t('Profile.menuGames') : '',
      icon: 'pi pi-fw pi-table',
      to: { name: 'Profile-Games' },
    },
    {
      label: displayText ? t('Profile.menuCards') : '',
      icon: 'pi pi-fw pi-calculator',
      to: { name: 'Profile-Cards' },
    },
    {
      label: displayText ? t('Profile.menuFriends') : '',
      icon: 'pi pi-fw pi-users',
      to: { name: 'Profile-Friends' },
    },
    {
      label: displayText ? t('Profile.menuSocials') : '',
      icon: 'pi pi-fw pi-sitemap',
      to: { name: 'Profile-Socials' },
    },
  ]
}

useResizeObserver(profileContainer, () => {
  updateMenu()
})
function updateMenu() {
  items.value = createMenu(profileContainer.value?.getBoundingClientRect().width === undefined || profileContainer.value?.getBoundingClientRect().width > 550)
}

const tabValueToName = computed({
  get: () => String(router.currentRoute.value.name),
  set: (value) => {
    router.push({ name: value })
  },
})

const loading = computed(() => {
  return playerStats.value == null || (isLoggedIn.value && myStats.value == null)
})
</script>

<style scoped>
.profilePage {
  position: relative;
  padding: 10px;
  flex: 0 1 800px;
  max-width: min(100%, 800px);
  margin-top: 50px;
}

.profileInformation {
  display: flex;
  flex-wrap: wrap;
}

.profilePictureContainer {
  max-width: 300px;
  min-width: 200px;
  flex: 1 0 40%;

  display: flex;
  flex-direction: center;
  align-items: center;
  justify-content: center;
  position: relative;
}

.profilePicture {
  margin-top: -70px;
  width: 100%;
  border-radius: 100%;
  object-fit: contain;
}

.hofOverPicture {
  position: absolute;
  bottom: 0;
  left: 0;
}

.userInfos {
  flex: 1 0 150px;
  display: flex;
  align-items: center;
  justify-items: center;
  flex-direction: column;
  margin: 0 20px;
}

.registered {
  font-size: small;
  font-style: italic;
}
</style>
