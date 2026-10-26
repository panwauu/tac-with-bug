import type { ModerationStatus } from '../sharedTypes/typesReports'
import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'
import type { GeneralSocketC } from '../test/socket'

describe('Moderation test suite via socket.io', () => {
  // UserA (index 0) is admin in the test database, the others are normal users
  let usersWithSockets: UserWithSocket[]
  let unauthenticatedSocket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 6 })
    unauthenticatedSocket = await getUnauthenticatedSocket()
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, unauthenticatedSocket])
  })

  const report = (i: number, username: string, category = 'username', body = '') =>
    usersWithSockets[i].socket.emitWithAck(5000, 'moderation:report', { username, category: category as any, body })

  test('Reporting needs a login and valid data', async () => {
    const unauth = await unauthenticatedSocket.emitWithAck(5000, 'moderation:report', { username: usersWithSockets[1].username, category: 'chat', body: '' })
    expect(unauth.status).toBe(500)

    const wrongCategory = await report(1, usersWithSockets[2].username, 'something')
    expect(wrongCategory.status).toBe(422)

    const tooLong = await report(1, usersWithSockets[2].username, 'chat', 'x'.repeat(501))
    expect(tooLong.status).toBe(422)

    const self = await report(1, usersWithSockets[1].username)
    expect(self.status).toBe(400)
    expect(self.error).toBe('SELF_REPORT')

    const unknown = await report(1, 'NoSuchUserAtAll')
    expect(unknown.status).toBe(400)
    expect(unknown.error).toBe('USER_NOT_FOUND')
  })

  test('A report reaches the admin, a second one of the same reporter is refused', async () => {
    const status = usersWithSockets[0].socket.oncePromise('moderation:status') as Promise<ModerationStatus>
    const res = await report(1, usersWithSockets[2].username, 'description', 'rude profile text')
    expect(res.status).toBe(200)
    expect((await status).openReports).toBe(1)

    const again = await report(1, usersWithSockets[2].username, 'chat')
    expect(again.status).toBe(400)
    expect(again.error).toBe('ALREADY_REPORTED')
  })

  test('Only moderators see the reports', async () => {
    const normal = await usersWithSockets[1].socket.emitWithAck(5000, 'moderation:reports')
    expect(normal.status).toBe(403)

    const admin = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:reports')
    expect(admin.status).toBe(200)
    expect(admin.data).toHaveLength(1)
    expect(admin.data?.[0].username).toBe(usersWithSockets[2].username)
    expect(admin.data?.[0].reports[0]).toMatchObject({ reporter: usersWithSockets[1].username, category: 'description', body: 'rude profile text' })
  })

  test('Dismissing closes the reports', async () => {
    const normal = await usersWithSockets[1].socket.emitWithAck(5000, 'moderation:dismiss', usersWithSockets[2].username)
    expect(normal.status).toBe(403)

    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:dismiss', usersWithSockets[2].username)
    expect(res.status).toBe(200)
    const reports = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:reports')
    expect(reports.data).toEqual([])
  })

  test('Three different reporters block a user automatically, at once and only until a moderator unblocks', async () => {
    const target = usersWithSockets[5]
    const before = await target.socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'hello' })
    expect(before.status).toBe(200)

    for (const i of [1, 2, 3]) {
      expect((await report(i, target.username, 'chat', 'insults')).status).toBe(200)
    }

    const blocked = await target.socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'hello' })
    expect(blocked.status).toBe(400)
    expect(blocked.error).toBe('BlockedByModeration')

    const reports = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:reports')
    const entry = reports.data?.find((r) => r.username === target.username)
    expect(entry?.reports).toHaveLength(3)
    expect(entry?.blockedUntil).not.toBeNull()

    const unblock = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:unblock', target.username)
    expect(unblock.status).toBe(200)
    const after = await target.socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'hello again' })
    expect(after.status).toBe(200)
  })

  test('A moderator blocks a user and resets the profile text', async () => {
    const target = usersWithSockets[4]
    await testServer.pgPool.query("UPDATE users SET user_description = 'bad words' WHERE id = $1;", [target.id])
    expect((await report(1, target.username, 'description')).status).toBe(200)

    const invalid = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:block', { username: target.username, days: 0, reason: 'x', resetProfile: true })
    expect(invalid.status).toBe(422)

    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:block', { username: target.username, days: 7, reason: 'Profile text', resetProfile: true })
    expect(res.status).toBe(200)

    const user = await testServer.pgPool.query('SELECT user_description FROM users WHERE id = $1;', [target.id])
    expect(user.rows[0].user_description).toBe('')
    const blocked = await target.socket.emitWithAck(5000, 'channel:sendMessage', { channel: 'general', body: 'hello' })
    expect(blocked.error).toBe('BlockedByModeration')
    const reports = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:reports')
    expect(reports.data?.find((r) => r.username === target.username)).toBeUndefined()

    await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:unblock', target.username)
  })

  test('Only admins name moderators, who then see the reports', async () => {
    const notAdmin = await usersWithSockets[1].socket.emitWithAck(5000, 'moderation:setModerator', { username: usersWithSockets[1].username, moderator: true })
    expect(notAdmin.status).toBe(403)

    const status = usersWithSockets[3].socket.oncePromise('moderation:status') as Promise<ModerationStatus>
    const res = await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:setModerator', { username: usersWithSockets[3].username, moderator: true })
    expect(res.status).toBe(200)
    expect(res.data).toEqual([usersWithSockets[3].username])
    expect(await status).toMatchObject({ moderator: true, admin: false })

    const reports = await usersWithSockets[3].socket.emitWithAck(5000, 'moderation:reports')
    expect(reports.status).toBe(200)

    // A moderator can not name other moderators
    const byModerator = await usersWithSockets[3].socket.emitWithAck(5000, 'moderation:setModerator', { username: usersWithSockets[1].username, moderator: true })
    expect(byModerator.status).toBe(403)

    await usersWithSockets[0].socket.emitWithAck(5000, 'moderation:setModerator', { username: usersWithSockets[3].username, moderator: false })
    const afterwards = await usersWithSockets[3].socket.emitWithAck(5000, 'moderation:reports')
    expect(afterwards.status).toBe(403)
  })
})
