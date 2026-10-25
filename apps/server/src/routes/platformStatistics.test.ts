import { locales } from '../sharedDefinitions/locales'
import { getPassedRatio, getPlatformStatistic } from '../services/platformStatistic'
import type { DayDatasetType, HourDatasetType } from '../sharedTypes/typesPlatformStatistic'
import { readFileSync } from 'node:fs'
import path from 'node:path'

describe('Platform Statistic Test Suite', () => {
  test('Test week data extrapolation with synthetic data', async () => {
    const dayDataset: DayDatasetType = Array.from(Array(7).keys()).map(() => [1 / 7, 1 / 7, 1 / 7])
    const hourDataset: HourDatasetType = Array.from(Array(24).keys()).map(() => [1 / 24, 1 / 24, 1 / 24])
    const ratio1 = getPassedRatio(0, 0, dayDataset, hourDataset)
    expect(ratio1[0]).toBeCloseTo(1 / 7 / 24, 8)
    expect(ratio1[1]).toBeCloseTo(1 / 7 / 24, 8)
    const ratio2 = getPassedRatio(3, 23, dayDataset, hourDataset)
    expect(ratio2[0]).toBeCloseTo(4 / 7, 8)
    expect(ratio2[1]).toBeCloseTo(4 / 7, 8)
    const ratio3 = getPassedRatio(4, 3, dayDataset, hourDataset)
    expect(ratio3[0]).toBeCloseTo(4 / 7 + 4 / 7 / 24, 8)
    expect(ratio3[1]).toBeCloseTo(4 / 7 + 4 / 7 / 24, 8)
    const ratio4 = getPassedRatio(6, 23, dayDataset, hourDataset)
    expect(ratio4[0]).toBeCloseTo(1, 8)
    expect(ratio4[1]).toBeCloseTo(1, 8)
    const ratio5 = getPassedRatio(0, 23, dayDataset, hourDataset)
    const ratio6 = getPassedRatio(1, 0, dayDataset, hourDataset)
    expect(ratio6[0] - ratio5[0]).toBeCloseTo(1 / 7 / 24, 8)
    expect(ratio6[1] - ratio5[1]).toBeCloseTo(1 / 7 / 24, 8)
  })

  test('Test week data extrapolation by begin of week', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio = getPassedRatio(0, 0, stats.dayDataset, stats.hourDataset)
    expect(ratio[0]).toBe(stats.hourDataset[0][0] * stats.dayDataset[0][0])
    expect(ratio[1]).toBe(stats.hourDataset[0][1] * stats.dayDataset[0][1])
    expect(ratio[2]).toBe(0)
  })

  test('Test week data extrapolation by end of monday', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio = getPassedRatio(0, 23, stats.dayDataset, stats.hourDataset)
    expect(ratio[0]).toBeCloseTo(stats.dayDataset[0][0], 2)
    expect(ratio[1]).toBeCloseTo(stats.dayDataset[0][1], 2)
    expect(ratio[2]).toBe(0)
  })

  test('Test week data extrapolation by start of tuesday', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio = getPassedRatio(1, 0, stats.dayDataset, stats.hourDataset)
    expect(ratio[0]).toBe(stats.dayDataset[0][0] + stats.hourDataset[0][0] * stats.dayDataset[1][0])
    expect(ratio[1]).toBe(stats.dayDataset[0][1] + stats.hourDataset[0][1] * stats.dayDataset[1][1])
    expect(ratio[2]).toBe(0)
  })

  test('Test week data extrapolation by mid of week', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio = getPassedRatio(3, 2, stats.dayDataset, stats.hourDataset)
    expect(ratio[0]).toBeCloseTo(
      stats.dayDataset[0][0] +
        stats.dayDataset[1][0] +
        stats.dayDataset[2][0] +
        (stats.hourDataset[0][0] + stats.hourDataset[1][0] + stats.hourDataset[2][0]) * stats.dayDataset[3][0],
      5
    )
    expect(ratio[1]).toBeCloseTo(
      stats.dayDataset[0][1] +
        stats.dayDataset[1][1] +
        stats.dayDataset[2][1] +
        (stats.hourDataset[0][1] + stats.hourDataset[1][1] + stats.hourDataset[2][1]) * stats.dayDataset[3][1],
      5
    )
    expect(ratio[2]).toBe(0)
  })

  test('Test week data extrapolation by end of week', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio = getPassedRatio(6, 23, stats.dayDataset, stats.hourDataset)
    expect(ratio[0]).toBeCloseTo(1, 1)
    expect(ratio[1]).toBeCloseTo(1, 1)
    expect(ratio[2]).toBe(0)
  })

  test('Test consistency over days', async () => {
    const stats = await getPlatformStatistic(testServer.pgPool)
    const ratio1 = getPassedRatio(0, 23, stats.dayDataset, stats.hourDataset)
    const ratio2 = getPassedRatio(1, 23, stats.dayDataset, stats.hourDataset)
    expect(ratio2[0] - ratio1[0]).toBeCloseTo(stats.dayDataset[1][0], 2)
    expect(ratio2[1] - ratio1[1]).toBeCloseTo(stats.dayDataset[1][1], 2)
  })

  test('Get Statistics', async () => {
    const response = await testAgent.get('/gameApi/getPlatformStats/')
    expect(response.statusCode).toBe(200)

    expect(response.body.localeDataset.map((e: any) => e.locale).sort()).toEqual(locales.sort())

    expect(response.body.activityHeatmap).toHaveLength(7)
    expect(response.body.activityHeatmap.every((r: any) => r.length === 24)).toBe(true)

    expect(response.body.hourDataset).toHaveLength(24)
    expect(response.body.hourDataset.every((r: any) => r.length === 2)).toBe(true)
    expect(response.body.hourDataset.map((r: any) => r[0]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
    expect(response.body.hourDataset.map((r: any) => r[1]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)

    expect(response.body.dayDataset).toHaveLength(7)
    expect(response.body.dayDataset.every((r: any) => r.length === 2)).toBe(true)
    expect(response.body.dayDataset.map((r: any) => r[0]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
    expect(response.body.dayDataset.map((r: any) => r[1]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
  })

  test('Get fun facts', async () => {
    const response = await testAgent.get('/gameApi/getPlatformFunFacts/')
    expect(response.statusCode).toBe(200)

    // The fun facts of the games are aggregated from game_results, not from the game JSON
    const games = await testServer.pgPool.query<{ n_players: number; coop: boolean; cards: number | null }>('SELECT n_players, coop, cards FROM game_results;')
    const coopGames = games.rows.filter((r) => r.coop)
    const coopCards = coopGames.map((r) => r.cards).filter((c): c is number => c != null)

    expect(response.body.nGames4).toBe(games.rows.filter((r) => r.n_players === 4).length)
    expect(response.body.nGames6).toBe(games.rows.filter((r) => r.n_players === 6).length)
    expect(response.body.nGamesTeam).toBe(coopGames.length)
    expect(coopCards.length).toBeGreaterThan(0)
    expect(response.body.bestTeamGame).toBe(Math.min(...coopCards))
    expect(response.body.worstTeamGame).toBe(Math.max(...coopCards))
    expect(response.body.averageTeamGame).toBeGreaterThanOrEqual(response.body.bestTeamGame)
    expect(response.body.averageTeamGame).toBeLessThanOrEqual(response.body.worstTeamGame)

    expect(response.body.fastestGame).toBeLessThanOrEqual(response.body.averagePlayingTime)
    expect(response.body.averagePlayingTime).toBeLessThanOrEqual(response.body.longestGame)

    expect(response.body.registeredUsers).toBeGreaterThan(0)
    expect(response.body.colors.length).toBeGreaterThan(0)
  })

  test('Test server version', async () => {
    // Get the root package.json for the version (!Not the server/package.json!)
    const packageJSON = JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', '..', 'package.json')).toString())
    expect(packageJSON).toBeDefined()
    expect(packageJSON).not.toBe('0.0.0')

    const response = await testAgent.get('/gameApi/getServerVersion/')
    expect(response.statusCode).toBe(200)
    expect(response.body).toBeDefined()
    expect(response.body).not.toBe('0.0.0')
    expect(response.body).toBe(packageJSON.version)
  })
})
