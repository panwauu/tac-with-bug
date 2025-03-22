<template>
  <div>
    <Button
      aria-label="Menu"
      type="button"
      icon="pi pi-chevron-down"
      text
      plain
      style="padding: 0.5rem"
      @click="toggle"
    >
      <i :class="['pi', 'pi-chevron-down', 'menuChevron', { menuChevronOpen: displayMenu }]" />
    </Button>
    <Menu
      ref="menuRef"
      :model="userMenu"
      :popup="true"
      :base-z-index="2000"
    />
  </div>
</template>

<script setup lang="ts">
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

import Button from 'primevue/button'

import { ref, onMounted, watch } from 'vue'
import router from '@/router/index'
import { isLoggedIn } from '@/services/useUser'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits<{ logout: [] }>()

const menuRef = ref<null | InstanceType<typeof Menu>>(null)

function returnMenu() {
  const menu: MenuItem[] = [
    {
      label: t('Home.Landing'),
      icon: 'pi pi-home',
      command: () => {
        router.push({ name: 'Landing' })
      },
    },
    {
      label: t('Home.PlayerSearch'),
      icon: 'pi pi-search',
      command: () => {
        router.push({ name: 'PlayerSearch' })
      },
    },
    {
      label: t('Home.Tournament'),
      icon: 'pi pi-sitemap',
      command: () => {
        router.push({ name: 'TournamentOverview' })
      },
    },
    {
      label: t('Home.Leaderboard'),
      icon: 'pi pi-thumbs-up',
      command: () => {
        router.push({ name: 'Leaders' })
      },
    },
    {
      label: t('Home.TutorialOverview'),
      icon: 'pi pi-question-circle',
      command: () => {
        router.push({ name: 'TutorialOverview' })
      },
    },
    {
      label: t('Home.Subscription'),
      icon: 'pi pi-money-bill',
      command: () => {
        router.push({ name: 'Subscription' })
      },
    },
    {
      label: t('Home.HOF'),
      icon: 'pi pi-star',
      command: () => {
        router.push({ name: 'HOF' })
      },
    },
    {
      label: t('Home.Settings'),
      icon: 'pi pi-cog',
      command: () => {
        router.push({ name: 'Settings' })
      },
    },
    {
      label: t('Home.Stats'),
      icon: 'pi pi-chart-line',
      command: () => {
        router.push({ name: 'Stats' })
      },
    },
  ]

  if (isLoggedIn.value) {
    menu.push({
      label: t('Home.signout'),
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
