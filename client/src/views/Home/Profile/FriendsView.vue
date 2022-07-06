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
import { friend } from '@/../../server/src/sharedTypes/typesFriends'
import { username as loggedInUsername } from '@/services/useUser'

const socket = injectStrict(SocketKey)
const friendsState = injectStrict(FriendsStateKey)
const props = defineProps<{ username: string }>()

const loading = ref(false)
const friends = ref<friend[]>([])

updateData()
watch(
  () => props.username,
  () => updateData()
)

async function updateData() {
  try {
    loading.value = true
    friends.value = await new Promise<friend[]>((resolve, reject) => {
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
    router.push({ name: 'Landing' })
  }
}

const friendsForTable = computed(() => {
  if (props.username === loggedInUsername.value) {
    return friendsState.friends
  }
  return friends.value
})
</script>

<style scoped></style>
