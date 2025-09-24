import { defineStore } from 'pinia'

import type { ChatElement, ChatMessage } from '@/../../server/src/sharedTypes/chat'
import { isLoggedIn, username } from '@/services/useUser'
import { nextTick, watch } from 'vue'
import router from '@/router'
import { i18n } from '@/services/i18n'
import { useWaitingStore } from './waiting'
import { useChatStore } from './chat'
import { useServerInfoStore } from './serverInfo'

const keepGameChannelAliveTime = 1000 * 60 * 15

export const useMessagesStore = defineStore('messages', {
  state: () => ({
    chats: [] as ChatElement[],
    channels: [
      { id: 'general', missedMessages: 0, endDate: null as null | number },
      { id: 'news', missedMessages: 0, endDate: null },
    ],
    expandedChats: [false, false, true],
    selectedChat: { type: 'channel' as 'channel' | 'chat', id: 'general' },
    chatMessages: [] as ChatMessage[],
  }),
  getters: {
    getRecentChats: (state) => {
      return {
        label: 'recent',
        icon: 'pi pi-clock',
        children: state.chats
          .toSorted((a, b) => Date.parse(b.lastMessage) - Date.parse(a.lastMessage))
          .slice(0, 5)
          .map((o) => {
            return {
              label: o.groupTitle ?? o.players?.filter((p) => p !== username.value)[0] ?? i18n.global.t('Chat.deletedPlayer'),
              id: o.chatid,
              created: o.created,
              numberOfUnread: o.numberOfUnread,
            }
          }),
      }
    },
    getChatMenu: (state) => [
      {
        label: 'privates',
        icon: 'pi pi-comment',
        expanded: state.expandedChats[0],
        children: state.chats
          .filter((o) => !o.groupChat)
          .sort((a, b) => Date.parse(b.lastMessage) - Date.parse(a.lastMessage))
          .map((o) => {
            return {
              label: o.players?.filter((p) => p !== username.value)[0] ?? i18n.global.t('Chat.deletedPlayer'),
              id: o.chatid,
              created: o.created,
              numberOfUnread: o.numberOfUnread,
            }
          }),
      },
      {
        label: 'groups',
        icon: 'pi pi-comments',
        expanded: state.expandedChats[1],
        children: state.chats
          .filter((o) => o.groupChat)
          .sort((a, b) => Date.parse(b.lastMessage) - Date.parse(a.lastMessage))
          .map((o) => {
            return {
              label: o.groupTitle,
              id: o.chatid,
              created: o.created,
              numberOfUnread: o.numberOfUnread,
            }
          }),
      },
      {
        label: 'channels',
        icon: 'pi pi-hashtag',
        expanded: state.expandedChats[2],
        children: state.channels
          .map((c) => {
            return {
              label: c.id,
              id: c.id,
              created: 0,
              numberOfUnread: c.missedMessages,
            }
          })
          .sort(channelSortFunction),
      },
    ],
    getCurrentChat: (state) => {
      return state.chats.find((c) => c.chatid === Number.parseInt(state.selectedChat.id))
    },
    getChatLabel: (state) => {
      if (state.selectedChat.type === 'channel') {
        return state.selectedChat.id
      }
      const chat = state.chats.find((c) => c.chatid === Number.parseInt(state.selectedChat.id))
      if (chat?.groupChat) {
        return chat.groupTitle
      }
      return chat?.players?.find((p) => p !== username.value) ?? i18n.global.t('Chat.deletedPlayer')
    },
    getChatIcon: (state) => {
      if (state.selectedChat.type === 'channel') {
        return 'hashtag'
      }
      return state.chats.find((c) => c.chatid === Number.parseInt(state.selectedChat.id))?.groupChat ? 'comments' : 'comment'
    },
    getChatNotifications: (state) => {
      if (state.selectedChat.type === 'channel') {
        return state.channels.find((c) => c.id === state.selectedChat.id)?.missedMessages ?? 0
      } else {
        return state.chats.find((c) => c.chatid.toString() === state.selectedChat.id)?.numberOfUnread ?? 0
      }
    },
    notificationsChat: (state) => {
      return state.chats.reduce((p, c) => (p += c.numberOfUnread), 0)
    },
    notificationsChannels: (state) => {
      return state.channels.reduce((p, c) => (p += c.missedMessages), 0)
    },
    mayNotUseChat: (state) => {
      console.log(state)
      if (state.selectedChat.type !== 'chat' || username.value == null) {
        return false
      }

      const chat = state.chats.find((c) => c.chatid === Number.parseInt(state.selectedChat.id))
      if (chat == null) {
        return false
      }

      const infoStore = useServerInfoStore()
      const bannedPlayers = infoStore.runningGames
        .filter((g) => g.teams.flat().includes(username.value ?? ''))
        .map((g) => g.teams.flat())
        .flat()
        .filter((p) => p !== username.value)

      return bannedPlayers.some((p) => chat.players.includes(p))
    },
    getDateGroupedChatMessages: (state) => {
      const messages: { date: string; messages: ChatMessage[] }[] = []
      state.chatMessages.forEach((m) => {
        if (messages.length === 0 || new Date(messages[messages.length - 1].date).toDateString() !== new Date(m.created).toDateString()) {
          messages.push({ date: m.created, messages: [m] })
        } else {
          messages[messages.length - 1].messages.push(m)
        }
      })
      return messages
    },
  },
  actions: {
    async initStore() {
      if (isLoggedIn.value) {
        this.$state.socket.emitWithAck(20000, 'chat:overview:load').then((data) => {
          if (data.data == null) {
            return
          }
          this.handleOverviewUpdate(data.data)
        })
      }
      this.$state.socket.on('chat:overview:update', (chats) => {
        this.handleOverviewUpdate(chats)
      })

      this.loadChatMessages()
      this.$state.socket.on('chat:singleChat:update', (data) => {
        this.handleSingleChatUpdate(data.chatid, data.messages)
      })
      this.$state.socket.on('channel:update', (data) => {
        this.handleChannelUpdate(data.channel, data.messages, true)
      })
    },
    loadChatMessages() {
      this.chatMessages = []
      if (this.selectedChat.type === 'chat') {
        this.$state.socket.emitWithAck(20000, 'chat:singleChat:load', { chatid: Number.parseInt(this.selectedChat.id) }).then((data) => {
          if (data.data == null) {
            return
          }
          this.handleSingleChatUpdate(data.data.chatid, data.data.messages)
        })
      } else {
        this.$state.socket.emitWithAck(20000, 'channel:load', { channel: this.selectedChat.id }).then((data) => {
          if (data.data == null) {
            return
          }
          this.handleChannelUpdate(data.data.channel, data.data.messages)
        })
      }
    },
    async handleOverviewUpdate(overview: ChatElement[]) {
      const chatStore = useChatStore()
      if (this.selectedChat.type === 'chat' && chatStore.displayChat) {
        const overviewElement = overview.find((e) => e.chatid.toString() === this.selectedChat.id)
        if (overviewElement != null && overviewElement.numberOfUnread > 0) {
          await this.markAsRead()
          overviewElement.numberOfUnread = 0
        }
      }

      this.chats = overview
    },
    handleSingleChatUpdate(chatid: number, messages: ChatMessage[]) {
      if (this.selectedChat.type === 'chat' && chatid === Number.parseInt(this.selectedChat.id)) {
        this.chatMessages = messages
      }
    },
    handleChannelUpdate(channel: string, messages: ChatMessage[], updateFromServer?: boolean) {
      const chatStore = useChatStore()
      const channelObj = this.channels.find((c) => c.id === channel)
      const isEmojiInGame =
        messages.length > 0 &&
        isEmoji(messages[messages.length - 1].body) &&
        router.currentRoute.value.query.gameID != null &&
        channel === `g-${router.currentRoute.value.query.gameID}`
      const toCurrentOpenChannel = this.selectedChat.type === 'channel' && channel === this.selectedChat.id && chatStore.displayChat
      if (channelObj != null && updateFromServer && messages[messages.length - 1].sender !== username.value && !isEmojiInGame && !toCurrentOpenChannel) {
        channelObj.missedMessages += 1
      }

      if (this.selectedChat.type === 'channel' && this.selectedChat.id === channel) {
        this.chatMessages = messages
      }
    },
    expandChatGroup(index: number) {
      if (index >= this.expandedChats.length) {
        return
      }
      this.expandedChats[index] = !this.expandedChats[index]
    },
    selectChat(channel: boolean, id: string) {
      if ((channel && this.channels.find((c) => c.id === id) == null) || (!channel && this.chats.find((c) => c.chatid.toString() === id) == null)) {
        this.selectedChat.type = 'channel'
        this.selectedChat.id = 'general'
        return
      }
      this.selectedChat.type = channel ? 'channel' : 'chat'
      this.selectedChat.id = id
      this.loadChatMessages()
      this.markAsRead()

      const chatStore = useChatStore()
      if (chatStore.responsiveMode) {
        chatStore.closeChatMenu()
      }
    },
    async markAsRead() {
      if (this.selectedChat.type === 'chat') {
        await this.$state.socket.emitWithAck(2000, 'chat:markAsRead', { chatid: Number.parseInt(this.selectedChat.id) })
      } else {
        const channel = this.channels.find((c) => c.id === this.selectedChat.id)
        if (channel != null) {
          channel.missedMessages = 0
        }
      }
    },
    async sendEmojiToChannel(data: { channel: string; emoji: string }) {
      await this.$state.socket.emitWithAck(2000, 'channel:sendMessage', { channel: data.channel, body: data.emoji })
    },
    async sendMessage(text: string) {
      if (this.selectedChat.type === 'chat' && !this.mayNotUseChat) {
        await this.$state.socket.emitWithAck(2000, 'chat:sendMessage', { chatid: Number.parseInt(this.selectedChat.id), body: text })
      } else {
        await this.$state.socket.emitWithAck(2000, 'channel:sendMessage', { channel: this.selectedChat.id, body: text })
      }
    },
    async startChat(users: { id: number; username: string }[], title: string | null) {
      if (title == null) {
        const chat = this.chats.find((c) => {
          return !c.groupChat && c.players?.includes(users[0].username)
        })
        if (chat != null) {
          this.selectChat(false, chat.chatid.toString())
          return
        }
      }

      const data = await this.$state.socket.emitWithAck(2000, 'chat:startChat', { userids: users.map((u) => u.id), title })
      if (data.data == null) {
        console.error(data.error)
        return
      }
      this.handleOverviewUpdate(data.data?.overview)
      this.selectChat(false, data.data.chatid.toString())
    },
    addChannel(channel: string, endDate?: number) {
      if (this.channels.find((c) => c.id === channel) == null) {
        this.channels.push({ id: channel, missedMessages: 0, endDate: endDate ?? null })
      }
    },
    removeGameChannels() {
      if (this.channels.find((c) => c.id.startsWith('g-')) != null) {
        this.channels = this.channels.filter((c) => !c.id.startsWith('g-'))
      }
      if (this.selectedChat.type === 'channel' && this.selectedChat.id.startsWith('g-')) {
        this.selectChat(true, 'general')
      }
    },
    updateGameChannels(newRunningGameIDs: number[], removedRunningGameIDs: number[], newRouteGameID: string | null, oldRouteGameID: string | null) {
      removedRunningGameIDs.forEach((id) => {
        const channel = this.channels.find((c) => c.id === `g-${id}`)
        if (channel != null) {
          channel.endDate = new Date().getTime() + keepGameChannelAliveTime
        }
        setTimeout(() => this.updateGameChannels([], [], null, null), keepGameChannelAliveTime + 1000)
      })
      newRunningGameIDs.forEach((id) => {
        this.addChannel(`g-${id}`)
      })

      const serverInfoStore = useServerInfoStore()
      if (
        oldRouteGameID != null &&
        oldRouteGameID !== newRouteGameID &&
        !serverInfoStore.runningGames
          .filter((g) => g.teams.flat().includes(username.value ?? '-'))
          .map((g) => g.id.toString())
          .includes(oldRouteGameID)
      ) {
        const channelIndex = this.channels.findIndex((c) => c.id === `g-${oldRouteGameID}`)
        if (channelIndex !== -1 && this.channels[channelIndex].endDate == null) {
          this.channels.splice(channelIndex, 1)
        }
      }
      if (newRouteGameID != null && newRouteGameID !== oldRouteGameID) {
        this.addChannel(`g-${newRouteGameID}`)
      }

      this.channels = this.channels.filter((c) => !c.id.startsWith('g-') || c.endDate == null || c.endDate > new Date().getTime())
    },
    removeWaitingRoomChannels() {
      if (this.channels.find((c) => c.id.startsWith('w-')) != null) {
        this.channels = this.channels.filter((c) => !c.id.startsWith('w-'))
      }
      if (this.selectedChat.type === 'channel' && this.selectedChat.id.startsWith('w-')) {
        this.selectChat(true, 'general')
      }
    },
  },
})

watch(
  () => isLoggedIn.value,
  () => {
    const messagesStore = useMessagesStore()
    messagesStore.selectChat(true, 'general')
    messagesStore.updateGameChannels([], [], null, null)
  }
)

watch(
  () => router.currentRoute.value.query.gameID,
  (newGameID, oldGameID) => {
    const messagesStore = useMessagesStore()
    messagesStore.updateGameChannels([], [], newGameID as string, oldGameID as string)
  }
)

nextTick(() => {
  const waitingStore = useWaitingStore()
  const messagesStore = useMessagesStore()
  const serverInfoStore = useServerInfoStore()
  messagesStore.initStore()

  watch(
    () => waitingStore.ownGame?.id,
    (newID, oldID) => {
      if (newID != null && oldID == null) {
        messagesStore.addChannel(`w-${newID.toString()}`)
        messagesStore.selectChat(true, `w-${newID.toString()}`)
      } else {
        messagesStore.removeWaitingRoomChannels()
      }
    }
  )

  watch(
    () => serverInfoStore.runningGames,
    (newGames, oldGames) => {
      const newGamesOfPlayer = newGames.filter(
        (g) => username.value != null && g.teams.flat().includes(username.value) && !oldGames.map((oldGame) => oldGame.id).includes(g.id)
      )
      const removedGamesOfPlayer = oldGames.filter(
        (g) => username.value != null && g.teams.flat().includes(username.value) && !newGames.map((newGame) => newGame.id).includes(g.id)
      )
      messagesStore.updateGameChannels(
        newGamesOfPlayer.map((g) => g.id),
        removedGamesOfPlayer.map((g) => g.id),
        null,
        null
      )
    },
    { deep: true }
  )
})

export function formatChannelName(channelName: string, isChannel: boolean) {
  if (isChannel && channelName.startsWith('g-')) {
    return `${i18n.global.t('Chat.Channels.Game')} ${channelName.substring(2)}`
  }
  if (isChannel && channelName.startsWith('w-')) {
    return `${i18n.global.t('Chat.Channels.Waiting')} ${channelName.substring(2)}`
  }
  if (isChannel) {
    return i18n.global.t(`Chat.Channels.${channelName}`)
  }
  return channelName
}

export function isEmoji(text: string) {
  return text.length === 2 && /\p{Extended_Pictographic}/u.test(text)
}

function channelSortFunction(a: { id: string }, b: { id: string }) {
  if (a.id === 'general') {
    return -1
  }
  if (b.id === 'general') {
    return 1
  }
  if (a.id === 'news') {
    return -1
  }
  if (b.id === 'news') {
    return 1
  }
  return a.id > b.id ? 1 : -1
}
