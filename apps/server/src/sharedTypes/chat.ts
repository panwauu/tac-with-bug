export interface ChatMessage {
  id: number
  body: string
  created: string
  sender: string | null
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
