import type { Friend } from '@/../../server/src/sharedTypes/typesFriends'
import type { GeneralSocketC } from '@/services/socket'
import { reactive, onBeforeUnmount, computed, type ComputedRef, type UnwrapNestedRefs } from 'vue'
import { useToast } from 'primevue/usetoast'
import { i18n } from '@/services/i18n'

export interface FriendsStateNonReactive {
  friends: Friend[]
  resetFriends: () => void
  setFriends: (data: Friend[]) => void
  friendshipStatus: (username: string) => 'done' | 'to' | 'from' | 'none'
  request: (username: string) => void
  confirm: (username: string) => void
  decline: (username: string) => void
  withdraw: (username: string) => void
  cancel: (username: string) => void
  numberOpenRequests: ComputedRef<number>
}

export type FriendsState = UnwrapNestedRefs<FriendsStateNonReactive>

export function userFriends(socket: GeneralSocketC): FriendsState {
  const toast = useToast()

  function errorToast() {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Friends.Toast.error-summary'),
      detail: i18n.global.t('Friends.Toast.error-detail'),
      life: 5000,
    })
  }

  const friendsState: FriendsState = reactive<FriendsStateNonReactive>({
    friends: [],
    resetFriends: () => {
      friendsState.friends = []
    },
    setFriends: (friends) => {
      friendsState.friends = friends.toSorted((a) => {
        return a.status !== 'done' ? -1 : 1
      })
    },
    friendshipStatus: (username) => {
      const friendship = friendsState.friends.find((f) => f.username === username)
      if (friendship === undefined) {
        return 'none'
      } else {
        return friendship.status
      }
    },
    numberOpenRequests: computed(() => {
      return friendsState.friends.filter((f) => f.status !== 'done' && f.status !== 'to').length
    }),
    request: async (username) => {
      const data = await socket.emitWithAck(1000, 'friends:request', username)
      if (data.status === 200) {
        toast.add({
          severity: 'success',
          summary: i18n.global.t('Friends.Toast.request-done-summary'),
          detail: i18n.global.t('Friends.Toast.request-done-detail', { username }),
          life: 5000,
        })
      } else {
        console.log(data)
        errorToast()
      }
    },
    confirm: async (username) => {
      const data = await socket.emitWithAck(1000, 'friends:confirm', username)
      if (data.status === 200) {
        toast.add({
          severity: 'success',
          summary: i18n.global.t('Friends.Toast.you-confirmed-friendship-summary'),
          detail: i18n.global.t('Friends.Toast.you-confirmed-friendship-detail', { username }),
          life: 5000,
        })
      } else {
        console.log(data)
        errorToast()
      }
    },
    decline: async (username) => {
      const data = await socket.emitWithAck(1000, 'friends:cancel', username)
      if (data.status === 200) {
        toast.add({
          severity: 'warn',
          summary: i18n.global.t('Friends.Toast.you-declined-request-summary'),
          detail: i18n.global.t('Friends.Toast.you-declined-request-detail', { username }),
          life: 5000,
        })
      } else {
        console.log(data)
        errorToast()
      }
    },
    withdraw: async (username) => {
      const data = await socket.emitWithAck(1000, 'friends:cancel', username)
      if (data.status === 200) {
        toast.add({
          severity: 'warn',
          summary: i18n.global.t('Friends.Toast.you-withdraw-request-summary'),
          detail: i18n.global.t('Friends.Toast.you-withdraw-request-detail', { username }),
          life: 5000,
        })
      } else {
        console.log(data)
        errorToast()
      }
    },
    cancel: async (username) => {
      const data = await socket.emitWithAck(1000, 'friends:cancel', username)
      if (data.status === 200) {
        toast.add({
          severity: 'warn',
          summary: i18n.global.t('Friends.Toast.you-cancelled-friendship-summary'),
          detail: i18n.global.t('Friends.Toast.you-cancelled-friendship-detail', { username }),
          life: 5000,
        })
      } else {
        console.log(data)
        errorToast()
      }
    },
  })

  socket.on('friends:update', friendsState.setFriends)

  socket.on('friends:new-request', (data: { username: string }) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Friends.Toast.new-friendship-request-summary'),
      detail: i18n.global.t('Friends.Toast.new-friendship-request-detail', { username: data.username }),
      life: 5000,
    })
  })

  socket.on('friends:friend-confirmed', (data: { username: string }) => {
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Friends.Toast.friend-confirmed-request-summary'),
      detail: i18n.global.t('Friends.Toast.friend-confirmed-request-detail', { username: data.username }),
      life: 5000,
    })
  })

  socket.on('friends:friend-withdrew', (data: { username: string }) => {
    toast.add({
      severity: 'warn',
      summary: i18n.global.t('Friends.Toast.friend-withdraw-request-summary'),
      detail: i18n.global.t('Friends.Toast.friend-withdraw-request-detail', { username: data.username }),
      life: 5000,
    })
  })

  socket.on('friends:friend-declined', (data: { username: string }) => {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Friends.Toast.friend-declined-request-summary'),
      detail: i18n.global.t('Friends.Toast.friend-declined-request-detail', { username: data.username }),
      life: 5000,
    })
  })

  socket.on('friends:friend-cancelled', (data: { username: string }) => {
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Friends.Toast.friend-cancelled-friendship-summary'),
      detail: i18n.global.t('Friends.Toast.friend-cancelled-friendship-detail', { username: data.username }),
      life: 5000,
    })
  })

  onBeforeUnmount(() => {
    socket.off('friends:update', friendsState.setFriends)
    socket.removeListener('friends:new-request')
  })

  return friendsState
}
