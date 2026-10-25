import type pg from 'pg'
import type {
  ActivityHeatmap,
  DayDatasetType,
  HourDatasetType,
  LocaleDataset,
  PlatformFunFacts,
  PlatformStats,
  UserAgentAnalysisData,
  WeekDatasetType,
  WeekDatasetDataType,
} from '../sharedTypes/typesPlatformStatistic'

const cacheDurationInMS = 60 * 60e3 // Update once per hour

/**
 * Both statistics aggregate the whole platform and are far too expensive to calculate per request.
 * The result is kept for an hour; the first request after that calculates it again. Requests that
 * arrive while a calculation is running share it instead of starting a second one.
 */
function hourlyCache<T>(calculate: (pgPool: pg.Pool) => Promise<T>) {
  let cache: Promise<{ data: T; date: number }> | null = null

  async function refresh(pgPool: pg.Pool): Promise<T> {
    const calculation = calculate(pgPool).then((data) => {
      return { data, date: Date.now() }
    })
    cache = calculation

    try {
      return (await calculation).data
    } catch (err) {
      // A failed calculation is not kept, so that the next request tries again
      if (cache === calculation) {
        cache = null
      }
      throw err
    }
  }

  async function get(pgPool: pg.Pool): Promise<T> {
    const cached = cache
    if (cached == null) return refresh(pgPool)

    const entry = await cached
    if (Date.now() - entry.date > cacheDurationInMS) return refresh(pgPool)
    return entry.data
  }

  return { get, refresh }
}

const platformFunFactsCache = hourlyCache(calculatePlatformFunFacts)
const platformStatisticCache = hourlyCache(calculatePlatformStatistic)

export function getPlatformFunFacts(pgPool: pg.Pool): Promise<PlatformFunFacts> {
  return platformFunFactsCache.get(pgPool)
}

export function getPlatformStatistic(pgPool: pg.Pool): Promise<PlatformStats> {
  return platformStatisticCache.get(pgPool)
}

/** Calculates both statistics and stores them, so that no visitor has to wait for a stale cache. */
export async function refreshPlatformStatisticCaches(pgPool: pg.Pool) {
  await Promise.all([platformFunFactsCache.refresh(pgPool), platformStatisticCache.refresh(pgPool)])
}

export async function calculatePlatformFunFacts(pgPool: pg.Pool) {
  const usersPromise = pgPool.query<{ activated: number; color_blind: number }>(
    'SELECT SUM(CASE WHEN activated=true THEN 1 ELSE 0 END)::int as activated, SUM(CASE WHEN color_blindness_flag=true THEN 1 ELSE 0 END)::int as color_blind FROM users;'
  )

  // game_results holds one short row per finished game (see init_db_tac.sql), so that the game JSON is not read
  const gamesPromise = pgPool.query<{
    games4: number
    games6: number
    gamesteam: number
    teammincards: number
    teamavgcards: number
    teammaxcards: number
    average_game_duration: number
    fastest_game: number
    longest_game: number
  }>(`
    SELECT
        COUNT(*) FILTER (WHERE n_players = 4)::INT as games4,
        COUNT(*) FILTER (WHERE n_players = 6)::INT as games6,
        COUNT(*) FILTER (WHERE coop)::INT as gamesteam,
        CAST(MIN(cards) FILTER (WHERE coop) AS INTEGER) as teammincards,
        CAST(AVG(cards) FILTER (WHERE coop) AS INTEGER) as teamavgcards,
        CAST(MAX(cards) FILTER (WHERE coop) AS INTEGER) as teammaxcards,
        EXTRACT(epoch FROM AVG(lastplayed - created))::INT as average_game_duration,
        EXTRACT(epoch FROM MIN(lastplayed - created))::INT as fastest_game,
        EXTRACT(epoch FROM MAX(lastplayed - created))::INT as longest_game
    FROM game_results;`)

  const tutorialPromise = pgPool.query(`SELECT sum(tutorial)::INT as absolved_tutorial_steps FROM
	(SELECT jsonb_array_elements(tutorial)::BOOLEAN::INT as tutorial FROM
		(SELECT jsonb_array_elements(tutorial) as tutorial FROM users) as t) as t2;`)

  const friendsPromise = pgPool.query('SELECT COUNT(*)::INT as number_friends FROM friendships WHERE pending_user IS NULL;')

  const colorsPromise = pgPool.query<{ color: string; count: number }>(
    "SELECT json_array_elements(colors) #>> '{}' as color, COUNT(*)::int FROM games GROUP BY color ORDER BY count DESC;"
  )

  // The queries do not depend on each other and run at the same time
  const [dbResUsers, gamesRes, tutorialRes, friendsRes, colorsRes] = await Promise.all([usersPromise, gamesPromise, tutorialPromise, friendsPromise, colorsPromise])

  return {
    nGames4: gamesRes.rows[0].games4,
    nGames6: gamesRes.rows[0].games6,
    nGamesTeam: gamesRes.rows[0].gamesteam,
    fastestGame: gamesRes.rows[0].fastest_game,
    longestGame: gamesRes.rows[0].longest_game,
    averagePlayingTime: gamesRes.rows[0].average_game_duration,
    bestTeamGame: gamesRes.rows[0].teammincards,
    worstTeamGame: gamesRes.rows[0].teammaxcards,
    averageTeamGame: gamesRes.rows[0].teamavgcards,
    registeredUsers: dbResUsers.rows[0].activated,
    nFriends: friendsRes.rows[0].number_friends,
    nTutorials: tutorialRes.rows[0].absolved_tutorial_steps,
    colors: colorsRes.rows.map((r) => r.color),
    nColorBlind: dbResUsers.rows[0].color_blind,
  }
}

/**
 * The timezone of the server. The statistics bucket the week and the day of the week in local time and the
 * hour in UTC, as they always did, and the database needs to be told which timezone that is.
 */
const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

interface DateBucket {
  kind: 'week' | 'day' | 'hour' | 'heatmap' | 'total'
  a: number | null
  b: number | null
  n: number
}

/**
 * Counts the dates of one table per week (a = year of the monday, b = ISO week), per day of the week
 * (a = day, monday is 0), per hour (a = hour) and in total, for the games also per day and hour of the
 * week (a = day, b = hour: the heatmap).
 *
 * The rows are counted in the database, so that the result has a few hundred rows instead of one row per
 * user and per game. $1 is the timezone of the server; the hour and the heatmap are in UTC.
 */
function dateBucketQuery(from: string, column: string, withHeatmap: boolean) {
  return `
    WITH dates AS MATERIALIZED (SELECT ${column} AT TIME ZONE $1 AS local, ${column} AT TIME ZONE 'UTC' AS utc FROM ${from})
    SELECT 'week' AS kind, EXTRACT(year FROM date_trunc('week', local))::INT AS a, EXTRACT(week FROM local)::INT AS b, COUNT(*)::INT AS n FROM dates GROUP BY 2, 3
    UNION ALL SELECT 'day', (EXTRACT(dow FROM local)::INT + 6) % 7, NULL, COUNT(*)::INT FROM dates GROUP BY 2
    UNION ALL SELECT 'hour', EXTRACT(hour FROM utc)::INT, NULL, COUNT(*)::INT FROM dates GROUP BY 2
    UNION ALL SELECT 'total', NULL, NULL, COUNT(*)::INT FROM dates${
      withHeatmap
        ? `
    UNION ALL SELECT 'heatmap', (EXTRACT(dow FROM utc)::INT + 6) % 7, EXTRACT(hour FROM utc)::INT, COUNT(*)::INT FROM dates GROUP BY 2, 3`
        : ''
    };`
}

/**
 * The players of one week are the distinct players of all games created in it, counted by the database.
 *
 * COUNT(DISTINCT userid) would make PostgreSQL sort all players of all games (and spill to disk); counting
 * the rows of a DISTINCT instead lets it group them in memory, which is about twice as fast.
 */
const playersPerWeekQuery = `
  SELECT year, week, COUNT(*)::INT AS n FROM (
    SELECT DISTINCT
      EXTRACT(year FROM date_trunc('week', games.created AT TIME ZONE $1))::INT AS year,
      EXTRACT(week FROM games.created AT TIME ZONE $1)::INT AS week,
      users_to_games.userid
    FROM users_to_games LEFT JOIN games ON users_to_games.gameid = games.id
  ) AS players GROUP BY year, week;`

// The current week and the current point in it, in the same timezones as the datasets above
const nowQuery = `
  SELECT
    EXTRACT(year FROM date_trunc('week', current_timestamp AT TIME ZONE $1))::INT AS year,
    EXTRACT(week FROM current_timestamp AT TIME ZONE $1)::INT AS week,
    (EXTRACT(dow FROM current_timestamp AT TIME ZONE $1)::INT + 6) % 7 AS day_from_monday,
    EXTRACT(hour FROM current_timestamp AT TIME ZONE 'UTC')::INT AS utc_hour;`

interface WeekCount {
  year: number
  week: number
  n: number
}
interface NowInWeek {
  year: number
  week: number
  day_from_monday: number
  utc_hour: number
}

function bucketsOf(rows: DateBucket[], kind: DateBucket['kind']) {
  return rows.filter((r) => r.kind === kind)
}

function totalOf(rows: DateBucket[]) {
  return bucketsOf(rows, 'total')[0].n
}

function createWeekDataset(
  userBuckets: DateBucket[],
  gameBuckets: DateBucket[],
  playersPerWeek: WeekCount[],
  now: NowInWeek,
  dayDataset: DayDatasetType,
  hourDataset: HourDatasetType
) {
  const weekDataset: WeekDatasetType = {
    data: createWeekDatasetRegular(userBuckets, gameBuckets, playersPerWeek, now),
    passedRatio: getPassedRatio(now.day_from_monday, now.utc_hour, dayDataset, hourDataset),
  }
  return weekDataset
}

function createWeekDatasetRegular(userBuckets: DateBucket[], gameBuckets: DateBucket[], playersPerWeek: WeekCount[], now: NowInWeek) {
  const weekDataset: WeekDatasetDataType = {}

  bucketsOf(userBuckets, 'week').forEach((r) => {
    weekEntry(weekDataset, r.a as number, r.b as number)[0] = r.n
  })
  bucketsOf(gameBuckets, 'week').forEach((r) => {
    weekEntry(weekDataset, r.a as number, r.b as number)[1] = r.n
  })
  playersPerWeek.forEach((r) => {
    weekEntry(weekDataset, r.year, r.week)[2] = r.n
  })

  // The current week is always part of the dataset, even when nothing has happened in it yet
  weekEntry(weekDataset, now.year, now.week)

  return weekDataset
}

function weekEntry(weekDataset: WeekDatasetDataType, year: number, week: number) {
  if (!(year in weekDataset)) {
    weekDataset[year] = {}
  }
  if (!(week in weekDataset[year])) {
    weekDataset[year][week] = [0, 0, 0]
  }
  return weekDataset[year][week]
}

export function getPassedRatio(dayIndexFromMonday: number, currentHour: number, dayDataset: DayDatasetType, hourDataset: HourDatasetType) {
  const passedDayData = [
    dayDataset
      .map((d: any) => d[0])
      .slice(0, dayIndexFromMonday)
      .reduce((a: number, b: number) => a + b, 0),
    dayDataset
      .map((d: any) => d[1])
      .slice(0, dayIndexFromMonday)
      .reduce((a: number, b: number) => a + b, 0),
  ]

  const currentDayData = [dayDataset[dayIndexFromMonday][0], dayDataset[dayIndexFromMonday][1]]

  const hourDataExtrapolation = [
    hourDataset
      .map((d: any) => d[0])
      .slice(0, currentHour + 1)
      .reduce((a: number, b: number) => a + b, 0),
    hourDataset
      .map((d: any) => d[1])
      .slice(0, currentHour + 1)
      .reduce((a: number, b: number) => a + b, 0),
  ]

  return [passedDayData[0] + currentDayData[0] * hourDataExtrapolation[0], passedDayData[1] + currentDayData[1] * hourDataExtrapolation[1], 0]
}

function createDayDataset(userBuckets: DateBucket[], gameBuckets: DateBucket[]) {
  const dayDataset: DayDatasetType = Array.from({ length: 7 }, () => [0, 0])
  bucketsOf(userBuckets, 'day').forEach((r) => {
    dayDataset[r.a as number][0] = r.n
  })
  bucketsOf(gameBuckets, 'day').forEach((r) => {
    dayDataset[r.a as number][1] = r.n
  })

  const nUsers = totalOf(userBuckets)
  const nGames = totalOf(gameBuckets)
  dayDataset.forEach((e) => {
    e[0] = Math.round((e[0] / nUsers) * 10000) / 10000
    e[1] = Math.round((e[1] / nGames) * 10000) / 10000
  })
  return dayDataset
}

function createHourDataset(userBuckets: DateBucket[], gameBuckets: DateBucket[]) {
  const hourDataset: HourDatasetType = Array.from({ length: 24 }, () => [0, 0])
  bucketsOf(userBuckets, 'hour').forEach((r) => {
    hourDataset[r.a as number][0] = r.n
  })
  bucketsOf(gameBuckets, 'hour').forEach((r) => {
    hourDataset[r.a as number][1] = r.n
  })

  const nUsers = totalOf(userBuckets)
  const nGames = totalOf(gameBuckets)
  hourDataset.forEach((e) => {
    e[0] = Math.round((e[0] / nUsers) * 10000) / 10000
    e[1] = Math.round((e[1] / nGames) * 10000) / 10000
  })
  return hourDataset
}

function createHeatmapDataset(gameBuckets: DateBucket[]) {
  const activityHeatmap: ActivityHeatmap = []
  for (let i = 0; i < 7; i++) {
    activityHeatmap.push(Array.from({ length: 24 }).fill(0) as number[])
  }
  bucketsOf(gameBuckets, 'heatmap').forEach((r) => {
    activityHeatmap[r.a as number][r.b as number] = r.n
  })
  return activityHeatmap
}

async function createLocaleDataset(pgPool: pg.Pool) {
  const langRes = await pgPool.query('SELECT locale, COUNT(*) as n_users FROM users GROUP BY locale;')
  const localeDataset: LocaleDataset = []
  langRes.rows.forEach((r: any) => {
    localeDataset.push({ locale: r.locale, nUsers: r.n_users })
  })
  return localeDataset
}

export async function calculatePlatformStatistic(pgPool: pg.Pool): Promise<PlatformStats> {
  // The queries do not depend on each other and run at the same time
  const [userBuckets, gameBuckets, playersPerWeek, now, localeDataset, userAgentDataset] = await Promise.all([
    pgPool.query<DateBucket>(dateBucketQuery('users WHERE activated = true', 'registered', false), [serverTimeZone]),
    // game_results holds exactly the finished games (see init_db_tac.sql), so that the game JSON is not read
    pgPool.query<DateBucket>(dateBucketQuery('game_results', 'created', true), [serverTimeZone]),
    pgPool.query<WeekCount>(playersPerWeekQuery, [serverTimeZone]),
    pgPool.query<NowInWeek>(nowQuery, [serverTimeZone]),
    createLocaleDataset(pgPool),
    getUserAgentAnalysis(pgPool),
  ])

  const hourDataset = createHourDataset(userBuckets.rows, gameBuckets.rows)
  const dayDataset = createDayDataset(userBuckets.rows, gameBuckets.rows)
  const weekDataset = createWeekDataset(userBuckets.rows, gameBuckets.rows, playersPerWeek.rows, now.rows[0], dayDataset, hourDataset)
  const activityHeatmap = createHeatmapDataset(gameBuckets.rows)

  return { weekDataset, dayDataset, hourDataset, activityHeatmap, localeDataset, userAgentDataset }
}

async function getUserAgentAnalysis(pgPool: pg.Pool): Promise<UserAgentAnalysisData> {
  const res = await pgPool.query<{ counter: number; data: any }>('SELECT data, counter FROM user_agent_data;')

  const deviceTypes: Record<string, number> = { console: 0, mobile: 0, tablet: 0, smarttv: 0, wearable: 0, embedded: 0, desktop: 0 }
  const browserNames: Record<string, number> = {}
  const osNames: Record<string, number> = {}
  for (const row of res.rows) {
    if (!(row.data.browser.name in browserNames)) {
      browserNames[row.data.browser.name] = 0
    }
    browserNames[row.data.browser.name] += row.counter

    const deviceType = row.data.device.type ?? 'desktop'
    deviceTypes[deviceType] = deviceTypes[deviceType] + row.counter

    if (row.data.os.name != null) {
      if (!(row.data.os.name in osNames)) {
        osNames[row.data.os.name] = 0
      }
      osNames[row.data.os.name] += row.counter
    }
  }

  return { deviceTypes, browserNames, osNames }
}
