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
        <Sponsor
          v-if="isSubscribed"
          :clickable="true"
          :sponsors-only="false"
          class="sponsorOverPicture"
        />
        <HofBadge
          v-if="hofReasons.length > 0"
          class="hofOverPicture"
        />
      </div>
      <div class="userInfos">
        <h1>{{ username }}</h1>
        <ProfileDescriptionText
          v-model="userDescription"
          :username="username"
        />
        <p class="registered">{{ t('Profile.registeredOn') }} {{ registeredOn.toLocaleDateString() }}</p>
        <BlockedByModerationMessage
          v-if="userBlockedUntil != null"
          :blocked-by-moderation-until="userBlockedUntil"
          :second-person="true"
        />
        <FriendButton :username="username" />
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
      style="padding-top: 15px"
      :radar-data="radarData"
      :games-distribution-data="gamesDistributionData"
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
import Sponsor from '@/components/SubscriptionTag.vue'
import ProfileExplanation from '@/components/ProfileExplanation.vue'
import HofBadge from '@/components/icons/HofBadge.vue'

import type { GamesDistributionData as GamesDistributionDataType } from '@/../../server/src/sharedTypes/typesPlayerStatistic'
import { watch, ref } from 'vue'
import { type HofReason, DefaultService as Service } from '@/generatedClient/index.ts'
import router from '@/router/index'
import ProfileDescriptionText from '@/components/ProfileDescriptionText.vue'
import { useResizeObserver } from '@vueuse/core'
import BlockedByModerationMessage from '@/components/BlockedByModerationMessage.vue'

const { t } = useI18n()

const props = defineProps<{ username: string }>()

const userDescription = ref('')
const isSubscribed = ref(false)
const radarData = ref<number[]>([])
const gamesDistributionData = ref<GamesDistributionDataType>({
  teamWon: 0,
  teamAborted: 0,
  won4: 0,
  lost4: 0,
  won6: 0,
  lost6: 0,
  aborted: 0,
  running: 0,
})
const hofReasons = ref<HofReason[]>([])
const items = ref(createMenu(true))
const profileContainer = ref<null | HTMLElement>(null)
const registeredOn = ref<Date>(new Date(0))
const userBlockedUntil = ref<string | null>(null)

updateData()
watch(
  () => props.username,
  () => updateData()
)

async function updateData() {
  try {
    const usernameStats = await Service.getPlayerStats(props.username)
    isSubscribed.value = usernameStats.subscriber
    radarData.value = usernameStats.table
    gamesDistributionData.value = usernameStats.gamesDistribution
    hofReasons.value = usernameStats.hof
    userDescription.value = usernameStats.userDescription
    registeredOn.value = new Date(usernameStats.registered)
    userBlockedUntil.value = usernameStats.blockedByModerationUntil
  } catch (err) {
    console.log(err)
    router.push({ name: 'Landing' })
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

const tabValueToName = ref<string>(String(router.currentRoute.value.name))
watch(
  tabValueToName,
  () => {
    const itemToPushTo = items.value.find((item) => item.to.name === tabValueToName.value)
    if (itemToPushTo != null) {
      router.push(itemToPushTo.to)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.profilePage {
  position: relative;
  padding: 10px;
  flex: 0 1 800px;
  max-width: 100%;
  margin-top: 70px;
}

.profileInformation {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
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
  margin-top: -90px;
  width: 100%;
  border-radius: 100%;
  object-fit: contain;
}

.sponsorOverPicture {
  position: absolute;
  bottom: 0;
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
