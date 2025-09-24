<template>
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'none' && !settingsStore.isBlockedByModeration"
    size="small"
    outlined
    severity="success"
    :label="t('Friends.FriendButton.requestFriend')"
    icon="pi pi-user-plus"
    @click="friendsState.request(username)"
  />
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'done'"
    severity="danger"
    size="small"
    outlined
    :label="t('Friends.FriendButton.cancelFriendship')"
    icon="pi pi-user-minus"
    @click="friendsState.cancel(username)"
  />
  <Button
    v-if="username !== loggedInUser && friendShipStatus === 'to'"
    severity="danger"
    size="small"
    outlined
    :label="t('Friends.FriendButton.withdrawRequest')"
    icon="pi pi-user-minus"
    @click="friendsState.withdraw(username)"
  />

  <ButtonGroup v-if="username !== loggedInUser && friendShipStatus === 'from'">
    <Button
      :label="t('Friends.FriendButton.acceptRequest')"
      icon="pi pi-user-plus"
      severity="success"
      size="small"
      outlined
      @click="friendsState.confirm(username)"
    />
    <Button
      icon="pi pi-user-minus"
      severity="danger"
      size="small"
      outlined
      @click="friendsState.decline(username)"
    />
  </ButtonGroup>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import { computed } from 'vue'
import { FriendsStateKey, injectStrict } from '@/services/injections'
import { username as loggedInUser } from '@/services/useUser'
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()
const props = defineProps<{ username: string }>()
const friendsState = injectStrict(FriendsStateKey)

const friendShipStatus = computed(() => {
  return friendsState.friendshipStatus(props.username)
})
</script>
