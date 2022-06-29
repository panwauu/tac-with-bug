import { TacServer } from '../server';
import supertest from 'supertest';
import { locales } from '../../../shared/shared/locales';
import { getPassedRatio, getPlatformStatistic } from '../services/platformStatistic';
import { dayDataset, hourDataset } from '../../../shared/types/typesPlatformStatistic';

describe('Platform Statistic Test Suite', () => {
    let agent: supertest.SuperAgentTest, server: TacServer;

    beforeAll(async () => {
        server = new TacServer()
        await server.listen(1234)
        agent = supertest.agent(server.httpServer)
    })

    afterAll(async () => {
        await server.destroy()
    })

    test('Test week data extrapolation with synthetic data', async () => {
        const dayDataset: dayDataset = Array.from(Array(7).keys()).map(() => [1 / 7, 1 / 7, 1 / 7])
        const hourDataset: hourDataset = Array.from(Array(24).keys()).map(() => [1 / 24, 1 / 24, 1 / 24])
        const ratio1 = getPassedRatio(0, 0, dayDataset, hourDataset)
        expect(ratio1[0]).toBe(1 / 7 / 24)
        expect(ratio1[1]).toBe(1 / 7 / 24)
        const ratio2 = getPassedRatio(3, 23, dayDataset, hourDataset)
        expect(ratio2[0]).toBe(4 / 7)
        expect(ratio2[1]).toBe(4 / 7)
        const ratio3 = getPassedRatio(4, 3, dayDataset, hourDataset)
        expect(ratio3[0]).toBe(4 / 7 + 4 / 7 / 24)
        expect(ratio3[1]).toBe(4 / 7 + 4 / 7 / 24)
        const ratio4 = getPassedRatio(6, 23, dayDataset, hourDataset)
        expect(ratio4[0]).toBeCloseTo(1, 8)
        expect(ratio4[1]).toBeCloseTo(1, 8)
        const ratio5 = getPassedRatio(0, 23, dayDataset, hourDataset)
        const ratio6 = getPassedRatio(1, 0, dayDataset, hourDataset)
        expect(ratio6[0] - ratio5[0]).toBeCloseTo(1 / 7 / 24, 8)
        expect(ratio6[1] - ratio5[1]).toBeCloseTo(1 / 7 / 24, 8)
    })

    test('Test week data extrapolation by begin of week', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio = getPassedRatio(0, 0, stats.dayDataset, stats.hourDataset)
        expect(ratio[0]).toBe(stats.hourDataset[0][0] * stats.dayDataset[0][0])
        expect(ratio[1]).toBe(stats.hourDataset[0][1] * stats.dayDataset[0][1])
        expect(ratio[2]).toBe(0)
    })

    test('Test week data extrapolation by end of monday', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio = getPassedRatio(0, 23, stats.dayDataset, stats.hourDataset)
        expect(ratio[0]).toBeCloseTo(stats.dayDataset[0][0], 2)
        expect(ratio[1]).toBeCloseTo(stats.dayDataset[0][1], 2)
        expect(ratio[2]).toBe(0)
    })

    test('Test week data extrapolation by start of tuesday', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio = getPassedRatio(1, 0, stats.dayDataset, stats.hourDataset)
        expect(ratio[0]).toBe(stats.dayDataset[0][0] + stats.hourDataset[0][0] * stats.dayDataset[1][0])
        expect(ratio[1]).toBe(stats.dayDataset[0][1] + stats.hourDataset[0][1] * stats.dayDataset[1][1])
        expect(ratio[2]).toBe(0)
    })

    test('Test week data extrapolation by mid of week', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio = getPassedRatio(3, 2, stats.dayDataset, stats.hourDataset)
        expect(ratio[0]).toBeCloseTo((stats.dayDataset[0][0] + stats.dayDataset[1][0] + stats.dayDataset[2][0]) + (stats.hourDataset[0][0] + stats.hourDataset[1][0] + stats.hourDataset[2][0]) * stats.dayDataset[3][0], 5)
        expect(ratio[1]).toBeCloseTo((stats.dayDataset[0][1] + stats.dayDataset[1][1] + stats.dayDataset[2][1]) + (stats.hourDataset[0][1] + stats.hourDataset[1][1] + stats.hourDataset[2][1]) * stats.dayDataset[3][1], 5)
        expect(ratio[2]).toBe(0)
    })

    test('Test week data extrapolation by end of week', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio = getPassedRatio(6, 23, stats.dayDataset, stats.hourDataset)
        expect(ratio[0]).toBeCloseTo(1, 1)
        expect(ratio[1]).toBeCloseTo(1, 1)
        expect(ratio[2]).toBe(0)
    })

    test('Test consistency over days', async () => {
        const stats = await getPlatformStatistic(server.pgPool)
        const ratio1 = getPassedRatio(0, 23, stats.dayDataset, stats.hourDataset)
        const ratio2 = getPassedRatio(1, 23, stats.dayDataset, stats.hourDataset)
        expect(ratio2[0] - ratio1[0]).toBeCloseTo(stats.dayDataset[1][0], 2)
        expect(ratio2[1] - ratio1[1]).toBeCloseTo(stats.dayDataset[1][1], 2)
    })

    test('Get Statistics', async () => {
        const response = await agent.get('/gameApi/getPlatformStats/')
        expect(response.statusCode).toBe(200)

        expect(response.body.localeDataset.map((e: any) => e.locale).sort()).toEqual(locales.sort())

        expect(response.body.activityHeatmap.length).toBe(7)
        expect(response.body.activityHeatmap.every((r: any) => r.length === 24)).toBe(true)

        expect(response.body.hourDataset.length).toBe(24)
        expect(response.body.hourDataset.every((r: any) => r.length === 2)).toBe(true)
        expect(response.body.hourDataset.map((r: any) => r[0]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
        expect(response.body.hourDataset.map((r: any) => r[1]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)

        expect(response.body.dayDataset.length).toBe(7)
        expect(response.body.dayDataset.every((r: any) => r.length === 2)).toBe(true)
        expect(response.body.dayDataset.map((r: any) => r[0]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
        expect(response.body.dayDataset.map((r: any) => r[1]).reduce((a: number, b: number) => a + b)).toBeCloseTo(1, 1)
    })
})
