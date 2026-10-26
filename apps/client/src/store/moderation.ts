import { defineStore } from 'pinia'
import { nextTick, watch } from 'vue'
import type { ModerationStatus } from '@/../../server/src/sharedTypes/typesReports'
import { isLoggedIn } from '@/services/useUser'

nextTick(() => {
  const moderationStore = useModerationStore()
  moderationStore.initStore()
})

// Only moderators and admins get 'moderation:status' from the server; everybody else keeps the defaults
export const useModerationStore = defineStore('moderation', {
  state: () => ({
    moderator: false,
    admin: false,
    openReports: 0,
  }),
  actions: {
    initStore() {
      this.$state.socket.on('moderation:status', (data: ModerationStatus) => {
        this.moderator = data.moderator
        this.admin = data.admin
        this.openReports = data.openReports
      })
      // Asking covers the status that the server pushed before this store listened
      const frage = async () => {
        const res = await this.$state.socket.emitWithAck(5000, 'moderation:status')
        if (res.status === 200 && res.data != null) this.$patch(res.data)
      }
      watch(
        isLoggedIn,
        (loggedIn) => {
          if (loggedIn) frage().catch(() => this.$reset())
          else this.$reset()
        },
        { immediate: true }
      )
    },
  },
})
