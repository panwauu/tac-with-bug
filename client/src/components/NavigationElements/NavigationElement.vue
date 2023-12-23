<template>
  <div>
    <Button
      aria-label="Menu"
      type="button"
      icon="pi pi-chevron-down"
      class="p-button-text p-button-plain"
      style="padding: 0.5rem"
      @click="toggle"
    >
      <i :class="['pi', 'pi-chevron-down', 'menuChevron', { menuChevronOpen: displayMenu }]" />
    </Button>
    <Menu
      ref="menuRef"
      :model="userMenu"
      :popup="true"
      :baseZIndex="2000"
    />
  </div>
</template>

<script setup lang="ts">
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

import Button from 'primevue/button'

import { ref, onMounted, watch } from 'vue'
import { i18n } from '@/services/i18n'
import router from '@/router/index'
import { isLoggedIn } from '@/services/useUser'

const emit = defineEmits<{ logout: [] }>()

const menuRef = ref<null | Menu>(null)

function returnMenu() {
  const menu: MenuItem[] = [
    {
      label: i18n.global.t('Home.Landing'),
      icon: 'pi pi-home',
      command: () => {
        router.push({ name: 'Landing' })
      },
    },
    {
      label: i18n.global.t('Home.PlayerSearch'),
      icon: 'pi pi-search',
      command: () => {
        router.push({ name: 'PlayerSearch' })
      },
    },
    {
      label: i18n.global.t('Home.Tournament'),
      icon: 'pi pi-sitemap',
      command: () => {
        router.push({ name: 'TournamentOverview' })
      },
    },
    {
      label: i18n.global.t('Home.Leaderboard'),
      icon: 'pi pi-thumbs-up',
      command: () => {
        router.push({ name: 'Leaders' })
      },
    },
    {
      label: i18n.global.t('Home.TutorialOverview'),
      icon: 'pi pi-question-circle',
      command: () => {
        router.push({ name: 'TutorialOverview' })
      },
    },
    {
      label: i18n.global.t('Home.Subscription'),
      icon: 'pi pi-money-bill',
      command: () => {
        router.push({ name: 'Subscription' })
      },
    },
    {
      label: i18n.global.t('Home.HOF'),
      icon: 'pi pi-star',
      command: () => {
        router.push({ name: 'HOF' })
      },
    },
    {
      label: i18n.global.t('Home.Settings'),
      icon: 'pi pi-cog',
      command: () => {
        router.push({ name: 'Settings' })
      },
    },
    {
      label: i18n.global.t('Home.Stats'),
      icon: 'pi pi-chart-line',
      command: () => {
        router.push({ name: 'Stats' })
      },
    },
  ]

  if (isLoggedIn.value) {
    menu.push({
      label: i18n.global.t('Home.signout'),
      icon: 'pi pi-sign-out',
      command: () => {
        emit('logout')
        router.push({ name: 'Landing' })
      },
    })
  }

  return menu
}

const userMenu = ref(returnMenu())
const displayMenu = ref(false)

const toggle = (event: Event) => {
  menuRef.value?.toggle(event)
}

onMounted(() => {
  watch(
    () => {
      return router.currentRoute.value.params.locale
    },
    () => {
      setTimeout(() => {
        userMenu.value = returnMenu()
      }, 200)
    }
  )

  watch(
    () => {
      return (menuRef.value as any)?.overlayVisible
    },
    (val: boolean) => {
      displayMenu.value = val
    }
  )

  watch(
    () => {
      return isLoggedIn.value
    },
    () => {
      userMenu.value = returnMenu()
    }
  )
})
</script>

<style scoped>
.menuChevron {
  transition: transform 0.5s;
}

.menuChevronOpen {
  transform: rotateX(180deg);
}
</style>
