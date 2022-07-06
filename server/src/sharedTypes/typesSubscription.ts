export interface SubscriptionExport {
  status: 'running' | 'cancelled' | 'expiring' | null
  validuntil: string | null
  freelicense: boolean
}
