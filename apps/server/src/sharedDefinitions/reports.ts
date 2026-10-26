// Maximal length of the text of a report
export const maxReportBodyLength = 500

// So many different users reporting the same user within the window block that user automatically,
// until a moderator has looked at it
export const autoBlockReporters = 3
export const autoBlockWindow = '24 hours'
export const autoBlockDurationHours = 24

// Moderation entries of automatic blocks have no moderator: insertedbyuserid is 0
export const automaticModeratorID = 0
