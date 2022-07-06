import type { GeneralSocketC } from '@/services/socket'
import type { subscriptionExport } from '@/../../shared/types/typesSubscription'

import { reactive, onBeforeUnmount } from 'vue'

export type subscriptionState = {
  status: string | null
  validuntil: string | null
  freelicense: boolean
  loading: boolean
  reset: () => void
  update: (data: subscriptionExport) => void
  getSubscription: () => void
  newSubscription: (subscriptionID: string) => Promise<any>
  cancelSubscription: () => Promise<any>
  isSub: () => boolean
}

export function useSubscription(socket: GeneralSocketC): subscriptionState {
  const subscriptionState: subscriptionState = reactive({
    status: null,
    validuntil: null,
    freelicense: false,
    loading: true,
    reset: () => {
      subscriptionState.status = null
      subscriptionState.validuntil = null
      subscriptionState.freelicense = false
      subscriptionState.loading = false
    },
    update: (data) => {
      subscriptionState.loading = false
      subscriptionState.status = data.status
      subscriptionState.validuntil = data.validuntil
      subscriptionState.freelicense = data.freelicense
      if (subscriptionState.validuntil != null) {
        const timeout = new Date(subscriptionState.validuntil).getTime() - Date.now()
        if (timeout < 2147483647) {
          setTimeout(function () {
            console.log('Trigger refresh because of validuntil off')
            subscriptionState.getSubscription()
          }, Math.max(0, timeout))
        }
      }
    },
    getSubscription: () => {
      socket.emit('subscription:get')
    },
    newSubscription: async (subscriptionID) => {
      const res = await socket.emitWithAck(10000, 'subscription:new', subscriptionID)
      if (res.status !== 200) {
        throw new Error('Server Error')
      }
    },
    cancelSubscription: async () => {
      const res = await socket.emitWithAck(10000, 'subscription:cancel')
      if (res.status !== 200) {
        throw new Error('Server Error')
      }
    },
    isSub: () => {
      if (subscriptionState.loading) {
        return false
      }
      return subscriptionState.freelicense || (subscriptionState.status != null && subscriptionState.status !== 'cancelled')
    },
  })

  socket.on('subscription:get', subscriptionState.update)
  socket.emit('subscription:get')

  onBeforeUnmount(() => {
    socket.off('subscription:get', subscriptionState.update)
  })

  return subscriptionState
}
