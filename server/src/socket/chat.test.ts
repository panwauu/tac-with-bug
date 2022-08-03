import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets, connectSocket } from '../test/handleSocket'
import { Chance } from 'chance'
import { GeneralSocketC } from '../test/socket'
import { io } from 'socket.io-client'
const chance = Chance()

describe('Test Suite via Socket.io', () => {
  let usersWithSockets: UserWithSocket[]
  let unauthenticatedSocket: GeneralSocketC

  beforeAll(async () => {
    usersWithSockets = await getUsersWithSockets({ n: 3 })
    unauthenticatedSocket = io('http://localhost:1234', { reconnection: false, forceNew: true, autoConnect: false }) as any
    await connectSocket(unauthenticatedSocket)
  })

  afterAll(async () => {
    await closeSockets([...usersWithSockets, unauthenticatedSocket])
  })

  describe('Test peer to peer chat', () => {
    let chatid: number

    test('Should not create a new chat if only one user or more than two users', async () => {
      const promiseOne = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [], title: null })
      expect(promiseOne.status).toBe(500)

      const promiseSelf = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[0].id], title: null })
      expect(promiseSelf.status).toBe(500)

      const promiseThree = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id, usersWithSockets[2].id], title: null })
      expect(promiseThree.status).toBe(500)

      const promiseWithout = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { title: null } as any)
      expect(promiseWithout.status).toBe(500)

      const promiseWithoutTitle = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id] } as any)
      expect(promiseWithoutTitle.status).toBe(500)
    })

    test('Should create a new chat', async () => {
      const promisesChatOverview = [usersWithSockets[0].socket.oncePromise('chat:overview:update'), usersWithSockets[1].socket.oncePromise('chat:overview:update')]

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id], title: null })
      expect(res.status).toBe(200)
      expect(typeof res.data?.chatid).toEqual('number')
      chatid = res.data?.chatid ?? -1

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].numberOfUnread).toBe(0)
      })
    })

    test('Should not create the same chat again', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id], title: null })
      expect(res.status).toBe(500)
    })

    test('Should not send a message with invalid data', async () => {
      const resWithoutId = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { body: 'test' } as any)
      expect(resWithoutId.status).toBe(500)

      const resWithoutBody = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid: chatid } as any)
      expect(resWithoutBody.status).toBe(500)

      const resWithWrongId = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid: 1000000, body: 'test' })
      expect(resWithWrongId.status).toBe(500)

      const resWithTooShortBody = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid, body: '' })
      expect(resWithTooShortBody.status).toBe(500)

      const resWithTooLongBody = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid, body: chance.string({ length: 501 }) })
      expect(resWithTooLongBody.status).toBe(500)
    })

    test('Should send a message', async () => {
      const promisesChatUpdate = [usersWithSockets[0].socket.oncePromise('chat:singleChat:update'), usersWithSockets[1].socket.oncePromise('chat:singleChat:update')]
      const promisesChatOverview = [usersWithSockets[0].socket.oncePromise('chat:overview:update'), usersWithSockets[1].socket.oncePromise('chat:overview:update')]

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid: chatid, body: 'test' })
      expect(res.status).toBe(200)

      const resultsChatUpdate = await Promise.all(promisesChatUpdate)
      resultsChatUpdate.forEach((resultChatUpdate) => {
        expect(resultChatUpdate.chatid).toBe(chatid)
        expect(resultChatUpdate.messages.length).toBe(1)
        expect(resultChatUpdate.messages[0].body).toBe('test')
        expect(resultChatUpdate.messages[0].sender).toBe('UserA')
      })

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview, i) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].numberOfUnread).toBe(i)
      })
    })

    test('Should not mark messages as read if wrong id', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:markAsRead', {} as any)
      expect(res.status).toBe(500)
    })

    test('Should mark messages as read', async () => {
      const promiseChatOverview = usersWithSockets[1].socket.oncePromise('chat:overview:update')

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:markAsRead', { chatid: chatid })
      expect(res.status).toBe(200)

      const resultChatOverview = await promiseChatOverview
      expect(resultChatOverview.length).toBe(1)
      expect(resultChatOverview[0].chatid).toBe(chatid)
      expect(resultChatOverview[0].numberOfUnread).toBe(0)
    })

    test('Should load the chat overview', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:overview:load')
      expect(res.status).toBe(200)
      expect(res.data?.length).toBe(1)
      expect(res.data?.[0].chatid).toBe(chatid)
      expect(res.data?.[0].numberOfUnread).toBe(0)
    })

    test('Should not load chat if wrong id', async () => {
      const resNoId = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:singleChat:load', {} as any)
      expect(resNoId.status).toBe(500)

      const resWrongId = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:singleChat:load', { chatid: 1000000 })
      expect(resWrongId.status).toBe(500)
    })

    test('Should not load chat if user not in chat', async () => {
      const resNoId = await usersWithSockets[2].socket.emitWithAck(5000, 'chat:singleChat:load', { chatid })
      expect(resNoId.status).toBe(500)
    })

    test('Should load one chat', async () => {
      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:singleChat:load', { chatid })
      expect(res.status).toBe(200)
      expect(res.data?.chatid).toBe(chatid)
      expect(res.data?.messages.length).toBe(1)
      expect(res.data?.messages[0].body).toBe('test')
      expect(res.data?.messages[0].sender).toBe('UserA')
    })

    test('Should not add user to private Chat', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { chatid, userid: usersWithSockets[2].id })
      expect(res.status).toBe(500)
    })

    test('Should not change title of private Chat', async () => {
      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:changeTitle', { chatid, title: 'testTitle' })
      expect(res.status).toBe(500)
    })

    test('User should not be able to leave chat with invalid id', async () => {
      const resNoID = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:leaveChat', {} as any)
      expect(resNoID.status).toBe(500)

      const resInvalidID = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:leaveChat', { chatid: 100000 })
      expect(resInvalidID.status).toBe(500)
    })

    test('User should be able to leave chat', async () => {
      const promisesChatOverview = [usersWithSockets[0].socket.oncePromise('chat:overview:update'), usersWithSockets[1].socket.oncePromise('chat:overview:update')]

      const res = await usersWithSockets[1].socket.emitWithAck(5000, 'chat:leaveChat', { chatid })
      expect(res.status).toBe(200)

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      const chatIndexInOverview0 = resultsChatOverview[0].findIndex((c) => c.chatid === chatid)
      expect(chatIndexInOverview0).not.toBe(-1)
      expect(resultsChatOverview[0][chatIndexInOverview0].chatid).toBe(chatid)
      const chatIndexInOverview1 = resultsChatOverview[1].findIndex((c) => c.chatid === chatid)
      expect(chatIndexInOverview1).toBe(-1)
    })
  })

  describe('Test group chat', () => {
    let chatid: number

    test('Should not create a new chat if only one user', async () => {
      const promiseOne = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id, usersWithSockets[1].id], title: 'testGroup' })
      expect(promiseOne.status).toBe(500)
    })

    test('Should create a new chat', async () => {
      const promisesChatOverview = [usersWithSockets[0].socket.oncePromise('chat:overview:update'), usersWithSockets[1].socket.oncePromise('chat:overview:update')]

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:startChat', { userids: [usersWithSockets[1].id], title: 'testGroup' })
      expect(res.status).toBe(200)
      expect(typeof res.data?.chatid).toEqual('number')
      chatid = res.data?.chatid ?? -1

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].numberOfUnread).toBe(0)
        expect(resultChatOverview[chatIndexInOverview].groupTitle).toBe('testGroup')
      })
    })

    test('Should not change title for invalid input', async () => {
      const resNoId = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:changeTitle', { title: 'groupChatChanged' } as any)
      expect(resNoId.status).toBe(500)

      const resNoTitle = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:changeTitle', { chatid } as any)
      expect(resNoTitle.status).toBe(500)

      const resInvalidId = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:changeTitle', { chatid: 1000000, title: 'groupChatChanged' } as any)
      expect(resInvalidId.status).toBe(500)

      const resInvalidPlayer = await usersWithSockets[2].socket.emitWithAck(5000, 'chat:changeTitle', { chatid: 1000000, title: 'groupChatChanged' } as any)
      expect(resInvalidPlayer.status).toBe(500)
    })

    test('Should change title', async () => {
      const promisesChatOverview = [usersWithSockets[0].socket.oncePromise('chat:overview:update'), usersWithSockets[1].socket.oncePromise('chat:overview:update')]

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:changeTitle', { chatid, title: 'groupChatChanged' })
      expect(res.status).toBe(200)

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].groupTitle).toBe('groupChatChanged')
      })
    })

    test('Should not add player for invalid request', async () => {
      const resAlreadyIn = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { chatid, userid: usersWithSockets[0].id })
      expect(resAlreadyIn.status).toBe(500)

      const resNoChatId = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { userid: usersWithSockets[2].id } as any)
      expect(resNoChatId.status).toBe(500)

      const resNoUser = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { chatid } as any)
      expect(resNoUser.status).toBe(500)

      const resInvalidID = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { chatid: 1000000, userid: usersWithSockets[2].id })
      expect(resInvalidID.status).toBe(500)
    })

    test('Should add player', async () => {
      const promisesChatOverview = usersWithSockets.map((uWS) => uWS.socket.oncePromise('chat:overview:update'))

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:addUser', { chatid, userid: usersWithSockets[2].id })
      expect(res.status).toBe(200)

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview, promiseIndex) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].groupTitle).toBe('groupChatChanged')
        expect(resultChatOverview[chatIndexInOverview].players.sort()).toEqual(
          usersWithSockets
            .map((uWS) => uWS.username)
            .filter((_, i) => i != promiseIndex)
            .sort()
        )
      })
    })

    test('Should send a message', async () => {
      const promisesChatUpdate = usersWithSockets.map((uWS) => uWS.socket.oncePromise('chat:singleChat:update'))
      const promisesChatOverview = usersWithSockets.map((uWS) => uWS.socket.oncePromise('chat:overview:update'))

      const res = await usersWithSockets[0].socket.emitWithAck(5000, 'chat:sendMessage', { chatid: chatid, body: 'test' })
      expect(res.status).toBe(200)

      const resultsChatUpdate = await Promise.all(promisesChatUpdate)
      resultsChatUpdate.forEach((resultChatUpdate) => {
        expect(resultChatUpdate.chatid).toBe(chatid)
        expect(resultChatUpdate.messages.length).toBe(1)
        expect(resultChatUpdate.messages[0].body).toBe('test')
        expect(resultChatUpdate.messages[0].sender).toBe('UserA')
      })

      const resultsChatOverview = await Promise.all(promisesChatOverview)
      resultsChatOverview.forEach((resultChatOverview, i) => {
        const chatIndexInOverview = resultChatOverview.findIndex((c) => c.chatid === chatid)
        expect(chatIndexInOverview).not.toBe(-1)
        expect(resultChatOverview[chatIndexInOverview].chatid).toBe(chatid)
        expect(resultChatOverview[chatIndexInOverview].numberOfUnread).toBe(i === 0 ? 0 : 1)
      })
    })
  })

  test('Chat should not work for unauthenticated users', async () => {
    const resStartChat = await unauthenticatedSocket.emitWithAck(5000, 'chat:startChat', { userids: [0], title: null })
    expect(resStartChat.status).toBe(500)

    const resAddUser = await unauthenticatedSocket.emitWithAck(5000, 'chat:addUser', { chatid: 0, userid: 0 })
    expect(resAddUser.status).toBe(500)

    const resChangeTitle = await unauthenticatedSocket.emitWithAck(5000, 'chat:changeTitle', { chatid: 0, title: 'test' })
    expect(resChangeTitle.status).toBe(500)

    const resLeaveChat = await unauthenticatedSocket.emitWithAck(5000, 'chat:leaveChat', { chatid: 0 })
    expect(resLeaveChat.status).toBe(500)

    const resMarkAsRead = await unauthenticatedSocket.emitWithAck(5000, 'chat:markAsRead', { chatid: 0 })
    expect(resMarkAsRead.status).toBe(500)

    const resMessage = await unauthenticatedSocket.emitWithAck(5000, 'chat:sendMessage', { chatid: 0, body: 'test' })
    expect(resMessage.status).toBe(500)

    const resLoadChat = await unauthenticatedSocket.emitWithAck(5000, 'chat:singleChat:load', { chatid: 0 })
    expect(resLoadChat.status).toBe(500)

    const resLoadOverview = await unauthenticatedSocket.emitWithAck(5000, 'chat:overview:load')
    expect(resLoadOverview.status).toBe(500)
  })
})
