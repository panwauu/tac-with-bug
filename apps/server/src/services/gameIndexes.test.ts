import type pg from 'pg'
import { abortNotEndedGames, disableRematchOfOldGames, endNotProperlyEndedGames, getRunningGames } from './game'

// The SQL a function sends first, without running it: the pool answers with no rows
async function firstQuery(fn: (pool: pg.Pool) => Promise<unknown>) {
  const calls: string[] = []
  const pool = {
    query: async (text: string) => {
      calls.push(text)
      return { rows: [], rowCount: 0 }
    },
  } as unknown as pg.Pool
  await fn(pool)
  return calls[0]
}

// The names of all indexes in a plan
function indexesIn(plan: unknown): string[] {
  if (Array.isArray(plan)) return plan.flatMap(indexesIn)
  if (plan == null || typeof plan !== 'object') return []
  const node = plan as Record<string, unknown>
  return [...(typeof node['Index Name'] === 'string' ? [node['Index Name']] : []), ...Object.values(node).flatMap(indexesIn)]
}

describe('Partial indexes for the running games and the open rematches', () => {
  const cases: Array<[string, (pool: pg.Pool) => Promise<unknown>, string]> = [
    ['list of running games (getRunningGames)', getRunningGames, 'games_running_idx'],
    ['job abortNotEndedGames (every minute)', abortNotEndedGames, 'games_running_idx'],
    ['job endNotProperlyEndedGames (every minute)', endNotProperlyEndedGames, 'games_running_idx'],
    ['job disableRematchOfOldGames (every 5 seconds)', disableRematchOfOldGames, 'games_rematch_open_idx'],
  ]

  test.each(cases)('%s can use its index', async (_, fn, index) => {
    const sql = await firstQuery(fn)
    expect(sql).toMatch(/FROM games|UPDATE games/)
    // The test database is small, so a sequential scan would be cheaper anyway; without it the planner shows whether the
    // query can use the index at all (EXPLAIN does not run the query)
    const client = await testServer.pgPool.connect()
    try {
      await client.query('SET enable_seqscan = off;')
      const res = await client.query(`EXPLAIN (FORMAT JSON) ${sql}`)
      expect(indexesIn(res.rows[0]['QUERY PLAN'])).toContain(index)
    } finally {
      await client.query('RESET enable_seqscan;')
      client.release()
    }
  })

  test('both indexes hold only the rows they are made for', async () => {
    const res = await testServer.pgPool.query<{ indexname: string; indexdef: string }>(
      "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'games' AND indexname IN ('games_running_idx', 'games_rematch_open_idx') ORDER BY indexname;"
    )
    expect(res.rows).toEqual([
      { indexname: 'games_rematch_open_idx', indexdef: 'CREATE INDEX games_rematch_open_idx ON public.games USING btree (lastplayed) WHERE rematch_open' },
      { indexname: 'games_running_idx', indexdef: 'CREATE INDEX games_running_idx ON public.games USING btree (id) WHERE running' },
    ])
  })
})
