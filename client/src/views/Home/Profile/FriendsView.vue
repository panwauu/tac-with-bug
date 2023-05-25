<template>
  <div>
    <DataTable :value="friendsForTable">
      <Column
        field="username"
        :header="$t('Profile.Friends.username')"
      >
        <template #body="slotProps">
          <PlayerWithPicture
            :username="slotProps.data.username"
            :nameFirst="false"
            :online="onlineFriends.includes(slotProps.data.username)"
          />
        </template>
      </Column>
      <Column
        field="date"
        :header="$t('Profile.Friends.friendssince')"
      >
        <template #body="slotProps">{{ new Date(slotProps.data.date).toLocaleDateString() }}</template>
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
  </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import PlayerWithPicture from '@/components/PlayerWithPicture.vue'
import FriendButton from '@/components/FriendButton.vue'

import { watch, ref, computed } from 'vue'
import router from '@/router/index'
import { injectStrict, SocketKey, FriendsStateKey } from '@/services/injections'
import type { Friend } from '@/../../server/src/sharedTypes/typesFriends'
import { username as loggedInUsername } from '@/services/useUser'

const socket = injectStrict(SocketKey)
const friendsState = injectStrict(FriendsStateKey)
const props = defineProps<{ username: string }>()

const loading = ref(false)
const friends = ref<Friend[]>([])

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

const friendsForTable = computed(() => {
  if (props.username === loggedInUsername.value) {
    return friendsState.friends
  }
  return friends.value
})

const onlineFriends = ref<string[]>([])

watch(
  () => friends.value,
  () => {
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
  }
)
</script>
