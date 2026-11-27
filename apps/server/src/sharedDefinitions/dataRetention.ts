// How long personal data is kept. Scheduled jobs delete everything older (services/dataRetention.ts).
// The privacy policy (client: DatenschutzInformation.vue) states these periods: change both together.

// Entries of the application log (table logs)
export const logRetention = '90 days'

// A password reset link can be used for this long (in seconds). Afterwards the request is deleted.
export const passwordResetValidityInSeconds = 15 * 60

// Blocks are kept this long after they ended and handled reports this long after they were handled.
// Moderators need them to recognise repeat offenders.
export const moderationRetention = '1 year'
