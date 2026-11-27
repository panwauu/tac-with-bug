/** Something that happened for the first time (a finished lesson, an achievement): when, and the points it gave. */
export interface ProgressMark {
  /** Time in milliseconds since 1970 */
  t: number
  /** Points given for it, counted once however many devices report it */
  p: number
}

/** One finished game in the list of the last games. */
export interface ProgressGame {
  id: string
  /** Time in milliseconds since 1970 */
  t: number
  mode: string
  level?: string
  won?: boolean
  cards: number
  rounds: number
}

/**
 * Progress of a player outside of the online games: statistics of games against the AI, achievements and finished
 * lessons. The keys belong to the clients, the server only knows how the three parts are merged.
 */
export interface Progress {
  /** Sums, a change adds to them (games played, cards played, ...) */
  counters: Record<string, number>
  /** First-time events, the earliest report stays */
  marks: Record<string, ProgressMark>
  /** The last games, oldest first */
  games: ProgressGame[]
}

/** What a device has added since its last change. */
export interface ProgressChange {
  /** Unique id of this change. A change that arrives twice is applied once, so it is safe to send it again. */
  id: string
  /** Applied first: drops the marks whose key starts with one of the prefixes, and the list of games */
  remove?: { marks?: string[]; games?: boolean }
  /** Added to the counters, may be negative (a device that resets its statistics takes back what it knew) */
  counters?: Record<string, number>
  marks?: Record<string, ProgressMark>
  games?: ProgressGame[]
}
