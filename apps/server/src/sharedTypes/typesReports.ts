export const reportCategories = ['username', 'picture', 'description', 'chat', 'other'] as const
export type ReportCategory = (typeof reportCategories)[number]

/** A chat or channel message that a report points to */
export interface ReportedMessageRef {
  type: 'chat' | 'channel'
  id: number
}

export interface Report {
  reporter: string | null
  category: ReportCategory
  body: string
  created: string
  /** Copy of the reported chat message, if the report came from the chat */
  message: string | null
  messageCreated: string | null
}

/** A user with open reports, as the moderation page shows it */
export interface ReportedUser {
  username: string
  userDescription: string
  blockedUntil: string | null
  reports: Report[]
}

/** A report with its outcome, as the history of a user shows it */
export interface HandledReport extends Report {
  handled: string | null
  handledBy: string | null
}

/** One block of a user, issued by a moderator */
export interface ModerationBlock {
  created: string
  blockedUntil: string
  reason: string | null
  moderator: string | null
}

/** Everything the moderation knows about one user: current block, all blocks and all reports */
export interface UserModerationHistory {
  username: string
  blockedUntil: string | null
  blocks: ModerationBlock[]
  reports: HandledReport[]
}

/** A user who is blocked at the moment */
export interface BlockedUser {
  username: string
  blockedUntil: string
  reason: string | null
  moderator: string | null
}

export interface ModerationStatus {
  moderator: boolean
  admin: boolean
  openReports: number
}
