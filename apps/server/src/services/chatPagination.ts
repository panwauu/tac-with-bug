import type { ChatMessage, ChatMessagePage } from '../sharedTypes/chat'

import { numberOfMessagesPerLoad } from '../sharedDefinitions/chat'

/**
 * Builds a message page from a query that selected one message more than
 * `numberOfMessagesPerLoad`. The additional oldest message is only used to
 * detect that further messages can be loaded and is not part of the page.
 */
export function buildMessagePage(rows: ChatMessage[]): ChatMessagePage {
  const hasOlderMessages = rows.length > numberOfMessagesPerLoad
  return { messages: hasOlderMessages ? rows.slice(rows.length - numberOfMessagesPerLoad) : rows, hasOlderMessages }
}
