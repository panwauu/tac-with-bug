import type { Progress, ProgressChange } from '../sharedTypes/typesProgress'
import { applyChange, emptyProgress, MAX_GAMES, MAX_MARKS, validateChange } from '../services/progress'
import { registerUserAndReturnCredentials, unregisterUser, User } from '../test/handleUserSockets'

const game = (id: string, t: number) => ({ id, t, mode: 'solo', level: 'schatten', won: true, cards: 180, rounds: 9 })

describe('Progress: merging a change', () => {
  test('Counters are added, also fractions of games against several opponents', () => {
    const first = applyChange(emptyProgress(), { id: 'change-1', counters: { 'solo.played': 2, 'radar.opp.luck': 1.5, 'radar.opp.aggr': 1 / 3 } })._unsafeUnwrap()
    const second = applyChange(first, { id: 'change-2', counters: { 'solo.played': 1, 'radar.opp.luck': 0.5, 'radar.opp.aggr': 1 / 3, 'solo.won': 1 } })._unsafeUnwrap()
    expect(second.counters['solo.played']).toBe(3)
    expect(second.counters['solo.won']).toBe(1)
    expect(second.counters['radar.opp.luck']).toBe(2)
    expect(second.counters['radar.opp.aggr']).toBeCloseTo(2 / 3, 5)
  })

  test('Of a mark the earliest report stays, so its points count once', () => {
    const first = applyChange(emptyProgress(), { id: 'change-1', marks: { 't.g01': { t: 2000, p: 25 } } })._unsafeUnwrap()
    const later = applyChange(first, { id: 'change-2', marks: { 't.g01': { t: 3000, p: 25 }, 'ach.first_game': { t: 3000, p: 20 } } })._unsafeUnwrap()
    expect(later.marks).toStrictEqual({ 't.g01': { t: 2000, p: 25 }, 'ach.first_game': { t: 3000, p: 20 } })
    const earlier = applyChange(later, { id: 'change-3', marks: { 't.g01': { t: 1000, p: 0 } } })._unsafeUnwrap()
    expect(earlier.marks['t.g01']).toStrictEqual({ t: 1000, p: 0 })
  })

  test('Games are united by id, sorted by time, and only the newest stay', () => {
    const first = applyChange(emptyProgress(), { id: 'change-1', games: [game('b', 2000), game('a', 1000)] })._unsafeUnwrap()
    const second = applyChange(first, { id: 'change-2', games: [game('a', 1000), game('c', 1500)] })._unsafeUnwrap()
    expect(second.games.map((g) => g.id)).toStrictEqual(['a', 'c', 'b'])

    const many = Array.from({ length: MAX_GAMES }, (_, i) => game(`n${i}`, 5000 + i))
    const full = applyChange(second, { id: 'change-3', games: many })._unsafeUnwrap()
    expect(full.games).toHaveLength(MAX_GAMES)
    expect(full.games[0].id).toBe('n0')
    expect(full.games.at(-1)?.id).toBe(`n${MAX_GAMES - 1}`)
  })

  test('Remove drops marks by prefix and the games before the rest of the change is added', () => {
    const progress: Progress = {
      counters: { 'solo.played': 4, xp: 300 },
      marks: { 't.g01': { t: 1, p: 25 }, 'feier.stufe_0': { t: 2, p: 0 }, 'ach.first_game': { t: 3, p: 20 } },
      games: [game('a', 1000)],
    }
    const res = applyChange(progress, {
      id: 'change-1',
      remove: { marks: ['t.', 'feier.'], games: true },
      counters: { 'solo.played': -4 },
      marks: { 't.g02': { t: 9, p: 25 } },
      games: [game('b', 2000)],
    })._unsafeUnwrap()
    expect(res.counters).toStrictEqual({ 'solo.played': 0, xp: 300 })
    expect(Object.keys(res.marks).sort()).toStrictEqual(['ach.first_game', 't.g02'])
    expect(res.games.map((g) => g.id)).toStrictEqual(['b'])
  })

  test('Too many marks in total are refused', () => {
    const marks = Object.fromEntries(Array.from({ length: MAX_MARKS }, (_, i) => [`t.${i}`, { t: 1, p: 0 }]))
    const full = applyChange(emptyProgress(), { id: 'change-1', marks })._unsafeUnwrap()
    expect(applyChange(full, { id: 'change-2', marks: { 't.more': { t: 1, p: 0 } } })._unsafeUnwrapErr()).toBe('TOO_MANY_MARKS')
  })

  test.each<[string, ProgressChange]>([
    ['CHANGE_ID_INVALID', { id: 'short' }],
    ['CHANGE_ID_INVALID', { id: 'with spaces in it' }],
    ['COUNTERS_INVALID', { id: 'change-1', counters: { 'bad key': 1 } }],
    ['COUNTERS_INVALID', { id: 'change-1', counters: { a: Number.POSITIVE_INFINITY } }],
    ['MARKS_INVALID', { id: 'change-1', marks: { a: { t: -1, p: 0 } } }],
    ['MARKS_INVALID', { id: 'change-1', marks: { a: { t: 1.5, p: 0 } } }],
    ['MARKS_INVALID', { id: 'change-1', marks: { a: { t: 1, p: 1e6 } } }],
    ['GAMES_INVALID', { id: 'change-1', games: [{ ...game('a', 1), id: 'not valid!' }] }],
    ['GAMES_INVALID', { id: 'change-1', games: [{ ...game('a', 1), cards: -1 }] }],
    ['REMOVE_INVALID', { id: 'change-1', remove: { marks: [''] } }],
  ])('Validation refuses with %s', (error, change) => {
    expect(validateChange(change)._unsafeUnwrapErr()).toBe(error)
  })
})

describe('Progress-REST test', () => {
  let user: User
  let otherUser: User

  beforeAll(async () => {
    user = await registerUserAndReturnCredentials()
    otherUser = await registerUserAndReturnCredentials()
  })

  afterAll(async () => {
    await unregisterUser(user)
    await unregisterUser(otherUser)
  })

  test('Unauthorized', async () => {
    expect((await testAgent.get('/gameApi/getProgress')).statusCode).toBe(401)
    expect((await testAgent.post('/gameApi/addProgress').send({ id: 'change-000' })).statusCode).toBe(401)
  })

  test('A new user has empty progress', async () => {
    const response = await testAgent.get('/gameApi/getProgress').set({ Authorization: user.authHeader })
    expect(response.statusCode).toBe(200)
    expect(response.body).toStrictEqual(emptyProgress())
  })

  test('Malformed changes are refused', async () => {
    const noId = await testAgent.post('/gameApi/addProgress').set({ Authorization: user.authHeader }).send({})
    expect(noId.statusCode).toBe(422)
    const wrongType = await testAgent
      .post('/gameApi/addProgress')
      .set({ Authorization: user.authHeader })
      .send({ id: 'change-000', counters: { a: 'one' } })
    expect(wrongType.statusCode).toBe(422)
    const badKey = await testAgent
      .post('/gameApi/addProgress')
      .set({ Authorization: user.authHeader })
      .send({ id: 'change-000', counters: { 'bad key': 1 } })
    expect(badKey.statusCode).toBe(409)
    expect(badKey.body).toBe('COUNTERS_INVALID')
  })

  test('A change is stored, and the same change sent again counts once', async () => {
    const change: ProgressChange = { id: 'change-001', counters: { 'solo.played': 1, xp: 80 }, marks: { 'ach.first_game': { t: 1000, p: 20 } }, games: [game('g1', 1000)] }
    const first = await testAgent.post('/gameApi/addProgress').set({ Authorization: user.authHeader }).send(change)
    expect(first.statusCode).toBe(200)
    expect(first.body.counters).toStrictEqual({ 'solo.played': 1, xp: 80 })

    const again = await testAgent.post('/gameApi/addProgress').set({ Authorization: user.authHeader }).send(change)
    expect(again.statusCode).toBe(200)
    expect(again.body).toStrictEqual(first.body)

    const stored = await testAgent.get('/gameApi/getProgress').set({ Authorization: user.authHeader })
    expect(stored.body).toStrictEqual(first.body)
  })

  test('Two devices add to the same progress', async () => {
    const phone: ProgressChange = { id: 'change-phone-1', counters: { 'solo.played': 2 }, marks: { 't.g01': { t: 5000, p: 25 } }, games: [game('g3', 3000)] }
    const tablet: ProgressChange = { id: 'change-tablet-1', counters: { 'solo.played': 1 }, marks: { 't.g01': { t: 4000, p: 25 } }, games: [game('g2', 2000)] }
    const responses = await Promise.all([phone, tablet].map((change) => testAgent.post('/gameApi/addProgress').set({ Authorization: user.authHeader }).send(change)))
    expect(responses.map((r) => r.statusCode)).toStrictEqual([200, 200])

    const stored = await testAgent.get('/gameApi/getProgress').set({ Authorization: user.authHeader })
    expect(stored.body.counters['solo.played']).toBe(4)
    expect(stored.body.marks['t.g01']).toStrictEqual({ t: 4000, p: 25 })
    expect(stored.body.games.map((g: { id: string }) => g.id)).toStrictEqual(['g1', 'g2', 'g3'])
  })

  test('Progress belongs to one user and is deleted with the user', async () => {
    const other = await testAgent.get('/gameApi/getProgress').set({ Authorization: otherUser.authHeader })
    expect(other.body).toStrictEqual(emptyProgress())

    const leaving = await registerUserAndReturnCredentials()
    await testAgent
      .post('/gameApi/addProgress')
      .set({ Authorization: leaving.authHeader })
      .send({ id: 'change-001', counters: { xp: 1 } })
    const before = await testServer.pgPool.query('SELECT 1 FROM user_progress WHERE userid = $1;', [leaving.id])
    expect(before.rowCount).toBe(1)
    await unregisterUser(leaving)
    const after = await testServer.pgPool.query('SELECT 1 FROM user_progress WHERE userid = $1;', [leaving.id])
    expect(after.rowCount).toBe(0)
  })
})
