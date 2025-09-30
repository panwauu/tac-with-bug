<template>
  <div>
    <DataTable
      :value="friendsForTable"
      :paginator="friendsForTable.length > 10"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      :sort-field="'totalGames'"
      :sort-order="-1"
    >
      <Column
        field="username"
        :header="t('Profile.Friends.username')"
        sortable
      >
        <template #body="slotProps">
          <PlayerWithPicture
            :username="slotProps.data.username"
            :name-first="false"
            :online="props.username === user.username ? onlineFriends.includes(slotProps.data.username) : undefined"
          />
        </template>
      </Column>
      <Column
        field="date"
        :header="t('Profile.Friends.friendssince')"
        sortable
      >
        <template #body="slotProps">{{ new Date(slotProps.data.date).toLocaleDateString() }}</template>
      </Column>
      <Column
        field="totalGames"
        :header="t('Profile.Friends.totalgames')"
        sortable
      >
        <template #body="slotProps">
          <div
            @click="showPopover($event, slotProps.data.username)"
            class="clickable"
          >
            {{ slotProps.data.totalGames }}
            <i class="pi pi-info-circle" />
          </div>
        </template>
      </Column>
      <Column
        v-if="username === loggedInUsername"
        field="status"
      >
        <template #body="slotProps">
          <FriendButton :username="slotProps.data.username" />
        </template>
      </Column>
    </DataTable>

    <Popover ref="popover">
      <div v-if="popoverUsername != null && popoverStats != null">
        <StatsWithPlayer
          :username="popoverUsername"
          :stats="popoverStats"
        />
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import FriendButton from '@/components/FriendButton.vue'
import Popover from 'primevue/popover'
import { watch, ref, computed, useTemplateRef, nextTick } from 'vue'
import router from '@/router/index'
import { injectStrict, SocketKey, FriendsStateKey } from '@/services/injections'
import type { Friend } from '@/../../server/src/sharedTypes/typesFriends'
import { username as loggedInUsername, user } from '@/services/useUser'
import type { PlayerFrontendStatistic } from '@/generatedClient'
import StatsWithPlayer from '@/components/StatsWithPlayer.vue'

const socket = injectStrict(SocketKey)
const friendsState = injectStrict(FriendsStateKey)
const props = defineProps<{ username: string; playerStats: PlayerFrontendStatistic }>()

const loading = ref(false)
const friends = ref<Friend[]>([])

// Pagination state for DataTable
const first = ref(0)
const rows = ref(10)

updateData().catch((err) => console.log(err))
watch(
  () => props.username,
  () => updateData().catch((err) => console.log(err))
)

async function updateData() {
  try {
    loading.value = true
    friends.value = await new Promise<Friend[]>((resolve, reject) => {
      setTimeout(() => reject(new Error('Socket.io Acknowledgement timed out')), 20000)

      socket.emit('friends:ofUser', props.username, (res) => {
        if (res.data === undefined) {
          return reject(new Error('Server Side Error '))
        }
        resolve(res.data)
      })
    })
    loading.value = false
  } catch (err) {
    console.log(err)
    await router.push({ name: 'Landing' })
  }
}

function getGamesWith(username: string): number {
  if (props.playerStats == null) {
    return 0
  }
  return props.playerStats.people[username]?.[4] ?? 0
}

const friendsForTable = computed(() => {
  if (props.username === loggedInUsername.value) {
    return friendsState.friends.map((f) => {
      return { ...f, totalGames: getGamesWith(f.username) }
    })
  }
  return friends.value.map((f) => {
    return { ...f, totalGames: getGamesWith(f.username) }
  })
})

const onlineFriends = ref<string[]>([])

watch(
  () => [...friends.value, props.username],
  () => {
    if (props.username !== user.username) {
      onlineFriends.value = []
      return
    }

    for (const friend of friends.value) {
      socket
        .emitWithAck(2000, 'friends:isFriendOnline', friend.username)
        .then((r) => {
          if (r.data != null && r.data) {
            onlineFriends.value.push(friend.username)
          }
        })
        .catch((err) => console.log(err))
    }
  },
  { deep: true }
)

const popover = useTemplateRef('popover')
const popoverUsername = ref<string>()
const popoverStats = ref<number[]>()

const showPopover = (event: any, username: string) => {
  popover.value?.hide()

  const stats = props.playerStats.people[username]

  if (username != null && username !== '' && stats != null && username !== popoverUsername.value) {
    popoverUsername.value = username
    popoverStats.value = stats

    nextTick(() => {
      popover.value?.show(event)
    })
  } else {
    popoverUsername.value = undefined
    popoverStats.value = undefined
  }
}
</script>
