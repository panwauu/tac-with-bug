export const reportCategories = ['username', 'picture', 'description', 'chat', 'other'] as const
export type ReportCategory = (typeof reportCategories)[number]

export interface Report {
  reporter: string | null
  category: ReportCategory
  body: string
  created: string
}

/** A user with open reports, as the moderation page shows it */
export interface ReportedUser {
  username: string
  userDescription: string
  blockedUntil: string | null
  reports: Report[]
}

export interface ModerationStatus {
  moderator: boolean
  admin: boolean
  openReports: number
}
