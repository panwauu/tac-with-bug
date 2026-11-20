import type pg from 'pg'
import { ok, err, Result } from 'neverthrow'
import type { Progress, ProgressChange, ProgressGame, ProgressMark } from '../sharedTypes/typesProgress'

// Progress of a player in the apps and in the tutorials: what used to live on one device only (statistics of the
// games against the AI, achievements, finished lessons) is kept with the account, so that it follows the player to
// another device. Devices can be offline and several can play at once, therefore they never send the whole state:
// a change only carries what was added, and the three parts merge without conflicts.
//   counters: the change is added
//   marks:    the earliest report stays, so points for the same lesson or achievement are given once
//   games:    united by id, the newest MAX_GAMES stay
// The values are reported by the clients and are not checked against anything. They are meant for the player's own
// eyes and must not be used for leaderboards.

export const MAX_COUNTERS = 500
export const MAX_MARKS = 1000
export const MAX_GAMES = 300
/** So many ids of applied changes are remembered per user. A device only ever repeats its last change, and only until it got the answer. */
export const MAX_REMEMBERED_CHANGES = 100
const MAX_PREFIXES = 20

const KEY = /^[A-Za-z0-9_.-]{1,60}$/
const CHANGE_ID = /^[A-Za-z0-9_-]{8,64}$/
const MAX_COUNTER = 1e12
const MAX_TIME = 1e14
const MAX_POINTS = 10000

export function emptyProgress(): Progress {
  return { counters: {}, marks: {}, games: [] }
}

const isInteger = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max
const isPlainObject = (o: unknown): o is Record<string, unknown> => typeof o === 'object' && o != null && !Array.isArray(o)

function isMark(m: unknown): m is ProgressMark {
  return isPlainObject(m) && isInteger(m.t, 0, MAX_TIME) && isInteger(m.p, 0, MAX_POINTS)
}

function isGame(g: unknown): g is ProgressGame {
  return (
    isPlainObject(g) &&
    typeof g.id === 'string' &&
    KEY.test(g.id) &&
    isInteger(g.t, 0, MAX_TIME) &&
    typeof g.mode === 'string' &&
    KEY.test(g.mode) &&
    (g.level == null || (typeof g.level === 'string' && KEY.test(g.level))) &&
    (g.won == null || typeof g.won === 'boolean') &&
    isInteger(g.cards, 0, 100000) &&
    isInteger(g.rounds, 0, 100000)
  )
}

export type ProgressValidationError =
  'CHANGE_ID_INVALID' | 'REMOVE_INVALID' | 'COUNTERS_INVALID' | 'MARKS_INVALID' | 'GAMES_INVALID' | 'TOO_MANY_COUNTERS' | 'TOO_MANY_MARKS' | 'TOO_MANY_GAMES'

export function validateChange(change: ProgressChange): Result<null, ProgressValidationError> {
  if (typeof change.id !== 'string' || !CHANGE_ID.test(change.id)) return err('CHANGE_ID_INVALID')

  const prefixes = change.remove?.marks ?? []
  if (!Array.isArray(prefixes) || prefixes.length > MAX_PREFIXES || prefixes.some((p) => typeof p !== 'string' || !KEY.test(p))) return err('REMOVE_INVALID')

  const counters = Object.entries(change.counters ?? {})
  if (counters.length > MAX_COUNTERS) return err('TOO_MANY_COUNTERS')
  if (counters.some(([key, n]) => !KEY.test(key) || typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > MAX_COUNTER)) return err('COUNTERS_INVALID')

  const marks = Object.entries(change.marks ?? {})
  if (marks.length > MAX_MARKS) return err('TOO_MANY_MARKS')
  if (marks.some(([key, mark]) => !KEY.test(key) || !isMark(mark))) return err('MARKS_INVALID')

  const games = change.games ?? []
  if (games.length > MAX_GAMES) return err('TOO_MANY_GAMES')
  if (games.some((game) => !isGame(game))) return err('GAMES_INVALID')

  return ok(null)
}

/** Sums of thirds and halves (values averaged over opponents) would otherwise never be equal on two devices */
const round = (n: number) => Math.round(n * 1e6) / 1e6

const startsWithOneOf = (key: string, prefixes: string[]) => prefixes.some((p) => key.startsWith(p))

/** The progress after the change; too many counters or marks in total are refused, old games fall out. */
export function applyChange(progress: Progress, change: ProgressChange): Result<Progress, 'TOO_MANY_COUNTERS' | 'TOO_MANY_MARKS'> {
  const removeMarks = change.remove?.marks ?? []

  const counters = { ...progress.counters }
  for (const [key, n] of Object.entries(change.counters ?? {})) {
    counters[key] = round((counters[key] ?? 0) + n)
  }
  if (Object.keys(counters).length > MAX_COUNTERS) return err('TOO_MANY_COUNTERS')

  const marks = Object.fromEntries(Object.entries(progress.marks).filter(([key]) => !startsWithOneOf(key, removeMarks)))
  for (const [key, mark] of Object.entries(change.marks ?? {})) {
    if (marks[key] == null || mark.t < marks[key].t) marks[key] = { t: mark.t, p: mark.p }
  }
  if (Object.keys(marks).length > MAX_MARKS) return err('TOO_MANY_MARKS')

  const games = new Map<string, ProgressGame>()
  for (const game of change.remove?.games === true ? [] : progress.games) games.set(game.id, game)
  for (const game of change.games ?? []) {
    if (!games.has(game.id)) games.set(game.id, { id: game.id, t: game.t, mode: game.mode, level: game.level, won: game.won, cards: game.cards, rounds: game.rounds })
  }
  const sorted = [...games.values()].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))

  return ok({ counters, marks, games: sorted.slice(-MAX_GAMES) })
}

export async function getProgress(pgPool: pg.Pool, userID: number): Promise<Progress> {
  const res = await pgPool.query<{ data: Partial<Progress> }>('SELECT data FROM user_progress WHERE userid = $1;', [userID])
  return { ...emptyProgress(), ...res.rows[0]?.data }
}

export type AddProgressError = ProgressValidationError
/** Applies the change of a device and returns the progress of the user after it. */
export async function addProgress(pgPool: pg.Pool, userID: number, change: ProgressChange): Promise<Result<Progress, AddProgressError>> {
  const valid = validateChange(change)
  if (valid.isErr()) return err(valid.error)

  // Two devices of the same user may send at the same moment: the row is locked until the change is stored
  const client = await pgPool.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO user_progress (userid) VALUES ($1) ON CONFLICT (userid) DO NOTHING;', [userID])
    const res = await client.query<{ data: Partial<Progress>; changes: string[] }>('SELECT data, changes FROM user_progress WHERE userid = $1 FOR UPDATE;', [userID])
    const progress = { ...emptyProgress(), ...res.rows[0].data }

    if (res.rows[0].changes.includes(change.id)) {
      await client.query('COMMIT')
      return ok(progress)
    }

    const applied = applyChange(progress, change)
    if (applied.isErr()) {
      await client.query('ROLLBACK')
      return err(applied.error)
    }

    const changes = [...res.rows[0].changes, change.id].slice(-MAX_REMEMBERED_CHANGES)
    await client.query('UPDATE user_progress SET data = $2, changes = $3, updated = current_timestamp WHERE userid = $1;', [userID, JSON.stringify(applied.value), changes])
    await client.query('COMMIT')
    return ok(applied.value)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
