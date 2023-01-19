export type UserIdentifier =
  | {
      username?: string
      email?: string
      id: number
    }
  | {
      username?: string
      email: string
      id?: number
    }
  | {
      username: string
      email?: string
      id?: number
    }

export interface User {
  id: number
  username: string
  email: string
  password: string
  registered: string
  lastlogin: string
  activated: boolean
  token: string
  locale: string
  colorBlindnessFlag: boolean
  userDescription: string
  gameDefaultPositions: [number, number]
  admin: boolean
}
