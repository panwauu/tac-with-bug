import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

describe('Test Suite via Socket.io', () => {
  let usersWithSockets: UserWithSocket[]

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 3 })
  })

  afterAll(async () => {
    await closeSockets(usersWithSockets)
  })

  describe('Test peer to peer chat', () => {
    test('Should not create a new chat if only one user or more than two users', async () => {
      const promiseOne = await new Promise<any>((resolve) => {
        usersWithSockets[0].socket.emit('chat:startChat', { userids: [], title: null }, (data) => {
          resolve(data)
        })
      })
      expect(promiseOne.status).toBe(500)

      const promiseThree = await new Promise<any>((resolve) => {
        usersWithSockets[0].socket.emit('chat:startChat', { userids: [usersWithSockets[1].id, usersWithSockets[2].id], title: null }, (data) => {
          resolve(data)
        })
      })
      expect(promiseThree.status).toBe(500)
    })

    test('Should create a new chat', async () => {
      const promise = await new Promise<any>((resolve) => {
        usersWithSockets[0].socket.emit('chat:startChat', { userids: [usersWithSockets[1].id], title: null }, (data) => {
          resolve(data)
        })
      })
      expect(promise.status).toBe(200)
    })

    test('Should not create the same chat again', async () => {
      const res = await new Promise<any>((r) => {
        usersWithSockets[0].socket.emit('chat:startChat', { userids: [usersWithSockets[1].id], title: null }, (d) => {
          r(d)
        })
      })
      expect(res.status).toBe(500)
    })

    test.todo('Send Message')
    test.todo('Leave Chat')
    test.todo('Mark as read')
    test.todo('Add Updates check')
  })

  test.todo('Group Chat')
  test.todo('Group Chat - Create')
  test.todo('Group Chat - Add Player')
  test.todo('Group Chat - Change Title')
  test.todo('Group Chat - markAsRead')
})
