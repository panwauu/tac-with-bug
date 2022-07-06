<template>
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'none'"
    class="p-button-sm p-button-outlined p-button-success"
    :label="$t('Friends.FriendButton.requestFriend')"
    icon="pi pi-user-plus"
    @click="friendsState.request(username)"
  />
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'done'"
    class="p-button-sm p-button-outlined p-button-danger"
    :label="$t('Friends.FriendButton.cancelFriendship')"
    icon="pi pi-user-minus"
    @click="friendsState.cancel(username)"
  />
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'to'"
    class="p-button-sm p-button-outlined p-button-danger"
    :label="$t('Friends.FriendButton.withdrawRequest')"
    icon="pi pi-user-minus"
    @click="friendsState.withdraw(username)"
  />
  <span
    v-if="username !== loggedInUser && friendShipStatus === 'from'"
    class="p-buttonset"
  >
    <Button
      :label="$t('Friends.FriendButton.acceptRequest')"
      icon="pi pi-user-plus"
      class="p-button-sm p-button-outlined p-button-success"
      @click="friendsState.confirm(username)"
    />
    <Button
      icon="pi pi-user-minus"
      class="p-button-sm p-button-outlined p-button-danger"
      @click="friendsState.decline(username)"
    />
  </span>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

import { computed } from 'vue'
import { FriendsStateKey, injectStrict } from '@/services/injections'
import { username as loggedInUser } from '@/services/useUser'

const props = defineProps<{ username: string }>()
const friendsState = injectStrict(FriendsStateKey)

const friendShipStatus = computed(() => {
  return friendsState.friendshipStatus(props.username)
})
</script>
