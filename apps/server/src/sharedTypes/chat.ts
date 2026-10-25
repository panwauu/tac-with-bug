export interface ChatMessage {
  id: number
  body: string
  created: string
  sender: string | null
}

/** One page of chat/channel messages, sorted from oldest to newest. */
export interface ChatMessagePage {
  messages: ChatMessage[]
  /** True if there are further messages older than the first one of this page. */
  hasOlderMessages: boolean
}

export interface ChatElement {
  chatid: number
  groupChat: boolean
  groupTitle: string
  created: string
  lastMessage: string
  players: string[]
  numberOfUnread: number
}
