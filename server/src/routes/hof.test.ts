describe('HOF Test Suite', () => {
    test('Get HOF data', async () => {
        const response = await test_agent.get('/gameApi/getHofData/')
        expect(response.statusCode).toBe(200)
        expect(response.body.verlag).toContain('UserA')
        expect(response.body.spende).toContain('UserB')
        expect(response.body.translation).toContain('UserC')
        expect(response.body.family).toContain('UserD')
        expect(response.body.family).toContain('UserE')
    })
})
