export interface subscriptionExport {
    status: 'running' | 'cancelled' | 'expiring' | null,
    validuntil: string | null,
    freelicense: boolean;
}