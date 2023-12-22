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

const cacheDurationFunFactsInMS = 60 * 60e3 // Update once per hour
let cachedPlatformFunFacts: Promise<{ data: PlatformFunFacts; date: number }> | null = null

export async function getPlatformFunFacts(pgPool: pg.Pool): Promise<PlatformFunFacts> {
  if (cachedPlatformFunFacts == null) {
    cachedPlatformFunFacts = calculatePlatformFunFacts(pgPool).then((res) => {
      return { data: res, date: Date.now() }
    })
  }

  let platformFunFacts = await cachedPlatformFunFacts

  if (Date.now() - platformFunFacts.date > cacheDurationFunFactsInMS) {
    cachedPlatformFunFacts = calculatePlatformFunFacts(pgPool).then((res) => {
      return { data: res, date: Date.now() }
    })
    platformFunFacts = await cachedPlatformFunFacts
  }

  return platformFunFacts.data
}

export async function calculatePlatformFunFacts(pgPool: pg.Pool) {
  const dbResUsers = await pgPool.query<{ activated: number; color_blind: number }>(
    'SELECT SUM(CASE WHEN activated=true THEN 1 ELSE 0 END)::int as activated, SUM(CASE WHEN color_blindness_flag=true THEN 1 ELSE 0 END)::int as color_blind FROM users;'
  )

  const gamesRes = await pgPool.query<{
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
        CAST(sum(games4flag) as INT) as games4,
        CAST(sum(games6flag) as INT) as games6,
        CAST(sum(gamesteamflag) as INT) as gamesteam,
        CAST(min(CASE WHEN gamesteamflag = 1 THEN playedcards ELSE NULL END) as INTEGER) as teammincards,
		CAST(avg(CASE WHEN gamesteamflag = 1 THEN playedcards ELSE NULL END) as INTEGER) as teamavgcards,
		CAST(max(CASE WHEN gamesteamflag = 1 THEN playedcards ELSE NULL END) as INTEGER) as teammaxcards,
        EXTRACT(epoch FROM avg(gameDuration))::INT as average_game_duration,
        EXTRACT(epoch FROM min(gameDuration))::INT as fastest_game,
        EXTRACT(epoch FROM max(gameDuration))::INT as longest_game
    FROM
        (SELECT 
            CASE WHEN n_players = 4 THEN 1 ELSE 0 END as games4flag,
            CASE WHEN n_players = 6 THEN 1 ELSE 0 END as games6flag,
            CASE WHEN CAST(game->>'coop' AS BOOLEAN) = true THEN 1 ELSE 0 END as gamesteamflag,
            lastplayed - created as gameDuration,
            (SELECT SUM(cards) FROM (SELECT CAST(jsonb_extract_path(value, 'cards', 'total', '0') AS INTEGER) as cards 
              FROM jsonb_array_elements(game->'statistic')) as tcards) as playedcards
        FROM games WHERE running=FALSE AND (game->'gameEnded')::BOOLEAN=TRUE) as t;`)

  const tutorialRes = await pgPool.query(`SELECT sum(tutorial)::INT as absolved_tutorial_steps FROM
	(SELECT jsonb_array_elements(tutorial)::BOOLEAN::INT as tutorial FROM
		(SELECT jsonb_array_elements(tutorial) as tutorial FROM users) as t) as t2;`)

  const friendsRes = await pgPool.query('SELECT COUNT(*)::INT as number_friends FROM friendships WHERE pending_user IS NULL;')

  const colorsRes = await pgPool.query<{ color: string; count: number }>(
    "SELECT json_array_elements(colors) #>> '{}' as color, COUNT(*)::int FROM games GROUP BY color ORDER BY count DESC;"
  )

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

function createWeekDataset(
  userRegisterDates: { registered: string }[],
  gamesCreatedDates: { created: string }[],
  activePlayerRes: { created: string; userid: number }[],
  dayDataset: DayDatasetType,
  hourDataset: HourDatasetType
) {
  const dayIndexFromMonday = (new Date().getDay() + 6) % 7
  const currentHour = new Date().getUTCHours()
  const weekDataset: WeekDatasetType = {
    data: createWeekDatasetRegular(userRegisterDates, gamesCreatedDates, activePlayerRes),
    passedRatio: getPassedRatio(dayIndexFromMonday, currentHour, dayDataset, hourDataset),
  }
  return weekDataset
}

function createWeekDatasetRegular(userRegisterDates: { registered: string }[], gamesCreatedDates: { created: string }[], activePlayerRes: { created: string; userid: number }[]) {
  const weekDataset: WeekDatasetDataType = {}

  userRegisterDates.forEach((r) => {
    const k = getYearAndNumberOfWeek(new Date(r.registered))
    if (!(k[0] in weekDataset)) {
      weekDataset[k[0]] = {}
    }
    if (!(k[1] in weekDataset[k[0]])) {
      weekDataset[k[0]][k[1]] = [0, 0, 0]
    }
    weekDataset[k[0]][k[1]][0] += 1
  })
  gamesCreatedDates.forEach((r) => {
    const k = getYearAndNumberOfWeek(new Date(r.created))
    if (!(k[0] in weekDataset)) {
      weekDataset[k[0]] = {}
    }
    if (!(k[1] in weekDataset[k[0]])) {
      weekDataset[k[0]][k[1]] = [0, 0, 0]
    }
    weekDataset[k[0]][k[1]][1] += 1
  })

  addPlayersPerWeek(activePlayerRes, weekDataset)

  const k = getYearAndNumberOfWeek(new Date())
  if (!(k[0] in weekDataset)) {
    weekDataset[k[0]] = {}
  }
  if (!(k[1] in weekDataset[k[0]])) {
    weekDataset[k[0]][k[1]] = [0, 0, 0]
  }

  return weekDataset
}

function addPlayersPerWeek(activePlayerRes: { created: string; userid: number }[], weekDataset: WeekDatasetDataType) {
  const playersPerWeek: { [key: string]: { [key: string]: number[] } } = {}
  activePlayerRes.forEach((r) => {
    const k = getYearAndNumberOfWeek(new Date(r.created))
    if (!(k[0] in playersPerWeek)) {
      playersPerWeek[k[0]] = {}
    }
    if (!(k[1] in playersPerWeek[k[0]])) {
      playersPerWeek[k[0]][k[1]] = []
    }
    if (!playersPerWeek[k[0]][k[1]].includes(r.userid)) {
      playersPerWeek[k[0]][k[1]].push(r.userid)
    }
  })
  for (const year in playersPerWeek) {
    for (const week in playersPerWeek[year]) {
      if (!(year in weekDataset)) {
        weekDataset[year] = {}
      }
      if (!(week in weekDataset[year])) {
        weekDataset[year][week] = [0, 0, 0]
      }
      weekDataset[year][week][2] = playersPerWeek[year][week].length
    }
  }
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

function createDayDataset(userRegisterDates: { registered: string }[], gamesCreatedDates: { created: string }[]) {
  const dayDataset: DayDatasetType = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ]
  userRegisterDates.forEach((r: any) => {
    dayDataset[(new Date(r.registered).getDay() + 6) % 7][0] += 1
  })
  gamesCreatedDates.forEach((r: any) => {
    dayDataset[(new Date(r.created).getDay() + 6) % 7][1] += 1
  })
  dayDataset.forEach((e) => {
    e[0] = Math.round((e[0] / userRegisterDates.length) * 10000) / 10000
    e[1] = Math.round((e[1] / gamesCreatedDates.length) * 10000) / 10000
  })
  return dayDataset
}

function createHourDataset(userRegisterDates: { registered: string }[], gamesCreatedDates: { created: string }[]) {
  const hourDataset: HourDatasetType = []
  for (let i = 0; i < 24; i++) {
    hourDataset.push([0, 0])
  }
  userRegisterDates.forEach((r: any) => {
    hourDataset[new Date(r.registered).getUTCHours()][0] += 1
  })
  gamesCreatedDates.forEach((r: any) => {
    hourDataset[new Date(r.created).getUTCHours()][1] += 1
  })
  hourDataset.forEach((e) => {
    e[0] = Math.round((e[0] / userRegisterDates.length) * 10000) / 10000
    e[1] = Math.round((e[1] / gamesCreatedDates.length) * 10000) / 10000
  })
  return hourDataset
}

function createHeatmapDataset(gamesCreatedDates: { created: string }[]) {
  const activityHeatmap: ActivityHeatmap = []
  for (let i = 0; i < 7; i++) {
    activityHeatmap.push(Array.from({ length: 24 }).fill(0) as number[])
  }
  gamesCreatedDates.forEach((r: any) => {
    const date = new Date(r.created)
    const day = (date.getUTCDay() + 6) % 7
    const hour = date.getUTCHours()
    activityHeatmap[day][hour] += 1
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

export async function getPlatformStatistic(pgPool: pg.Pool): Promise<PlatformStats> {
  const userRes = await pgPool.query<{ registered: string }>('SELECT registered FROM users WHERE activated=true;')
  const activePlayerRes = await pgPool.query<{ created: string; userid: number }>(
    'SELECT userid, games.created FROM users_to_games LEFT JOIN games ON users_to_games.gameid=games.id;'
  )
  const gameRes = await pgPool.query<{ created: string }>("SELECT created FROM games WHERE running=FALSE AND (game->'gameEnded')::BOOLEAN=TRUE;")

  const hourDataset = createHourDataset(userRes.rows, gameRes.rows)
  const dayDataset = createDayDataset(userRes.rows, gameRes.rows)
  const weekDataset = createWeekDataset(userRes.rows, gameRes.rows, activePlayerRes.rows, dayDataset, hourDataset)
  const activityHeatmap = createHeatmapDataset(gameRes.rows)
  const localeDataset = await createLocaleDataset(pgPool)
  const userAgentDataset = await getUserAgentAnalysis(pgPool)

  return { weekDataset, dayDataset, hourDataset, activityHeatmap, localeDataset, userAgentDataset }
}

function getYearAndNumberOfWeek(date: Date): [number, number] {
  const m = ISO8601_week_no(date)
  const d = new Date(date)
  const day = d.getDay()
  return [new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))).getFullYear(), m]
}

function ISO8601_week_no(dt: Date) {
  const tdt = new Date(dt.valueOf())
  const dayn = (dt.getDay() + 6) % 7
  tdt.setDate(tdt.getDate() - dayn + 3)
  const firstThursday = tdt.valueOf()
  tdt.setMonth(0, 1)
  if (tdt.getDay() !== 4) {
    tdt.setMonth(0, 1 + ((4 - tdt.getDay() + 7) % 7))
  }
  return 1 + Math.ceil((firstThursday - tdt.valueOf()) / 604800000)
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
