import { getUnauthenticatedSocket, getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets.js'
import { closeSockets, connectSocket } from '../test/handleSocket.js'
import type { GeneralSocketC } from '../test/socket.js'

describe('Tutorial Test Suite via Socket.io', () => {
  describe('Test Tutorials', () => {
    let userWithSocket: UserWithSocket, socket: GeneralSocketC

    beforeAll(async () => {
      userWithSocket = (await getUsersWithSockets({ n: 1 }))[0]
      socket = await getUnauthenticatedSocket()
    })

    afterAll(async () => {
      await closeSockets([userWithSocket, socket])
    })

    test('On connection the tutorial progress should be sent to unauthenticated client', async () => {
      await closeSockets([socket])

      const promise = socket.oncePromise('tutorial:loadProgress')
      await connectSocket(socket)

      const progress = await promise
      expect(progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('On connection the tutorial progress should be sent to authenticated client', async () => {
      await closeSockets([userWithSocket.socket])

      const promise = userWithSocket.socket.oncePromise('tutorial:loadProgress')
      await connectSocket(userWithSocket.socket)

      const progress = await promise
      expect(progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('On login and logout the tutorial progress should be sent to authenticated client', async () => {
      const promiseLogout = userWithSocket.socket.oncePromise('tutorial:loadProgress')
      const logoutData = await userWithSocket.socket.emitWithAck(5000, 'logout')
      expect(logoutData.status).toBe(200)
      await promiseLogout
      expect(await promiseLogout).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])

      const promiseLogin = userWithSocket.socket.oncePromise('tutorial:loadProgress')
      const loginData = await userWithSocket.socket.emitWithAck(5000, 'login', { token: userWithSocket.token })
      expect(loginData.status).toBe(200)
      await promiseLogin
      expect(await promiseLogin).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should not be saved with missing data', async () => {
      const responseWithoutDone = await (userWithSocket.socket as any).emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0 })
      expect(responseWithoutDone.status).toBe(500)
      expect(responseWithoutDone.error.details[0].message).toContain('done')

      const responseWithoutID = await (userWithSocket.socket as any).emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialStep: 0, done: false })
      expect(responseWithoutID.status).toBe(500)
      expect(responseWithoutID.error.details[0].message).toContain('tutorialID')

      const responseWithoutStep = await (userWithSocket.socket as any).emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, done: false })
      expect(responseWithoutStep.status).toBe(500)
      expect(responseWithoutStep.error.details[0].message).toContain('tutorialStep')
    })

    test('Progress should not be saved with invalid ID or Step', async () => {
      const responseInvalidID = await userWithSocket.socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 1000, tutorialStep: 0, done: true })
      expect(responseInvalidID.status).toBe(500)
      expect(responseInvalidID.error).toEqual('TUTORIAL_ID_NOT_VALID')

      const responseInvalidStep = await userWithSocket.socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 1000, done: true })
      expect(responseInvalidStep.status).toBe(500)
      expect(responseInvalidStep.error).toEqual('TUTORIAL_STEP_NOT_VALID')
    })

    test('Progress should not be saved if not authenticated', async () => {
      const response = await socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true })
      expect(response.status).toBe(500)
    })

    test('Progress should be saved for valid data - set to true', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true })
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[true, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be saved for valid data - set to false', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: false })
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should not be reseted for unauthenticated user', async () => {
      const response = await socket.emitWithAck(5000, 'tutorial:resetTutorial', { tutorialID: 0 })
      expect(response.status).toBe(500)
    })

    test('Progress should not be reseted for invalid data', async () => {
      const responseNegative = await userWithSocket.socket.emitWithAck(5000, 'tutorial:resetTutorial', { tutorialID: -1 })
      expect(responseNegative.status).toBe(500)

      const responseUndefined = await userWithSocket.socket.emitWithAck(5000, 'tutorial:resetTutorial', undefined as any)
      expect(responseUndefined.status).toBe(500)
    })

    test('Progress should not be reseted for wrong id', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:resetTutorial', { tutorialID: 1000000 })
      expect(response.status).toBe(500)
    })

    test('Progress should be saved for valid data - set to true', async () => {
      const setRes = await userWithSocket.socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true })
      expect(setRes.status).toBe(200)
      expect(setRes.data?.progress).toEqual([[true, false, false, false, false, false, false, false, false, false, false]])

      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:resetTutorial', { tutorialID: 0 })
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be loaded with changed values for authenticated user', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:loadProgress')
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be loaded for unauthenticated user', async () => {
      const response = await socket.emitWithAck(5000, 'tutorial:loadProgress')
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Tutorial step should not be loaded for wrong data', async () => {
      const responseNoId = await userWithSocket.socket.emitWithAck(5000, 'tutorial:load', { tutorialStep: 0 } as any)
      expect(responseNoId.status).toBe(500)

      const responseNoStep = await userWithSocket.socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 0 } as any)
      expect(responseNoStep.status).toBe(500)

      const responseLargeId = await userWithSocket.socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 1000000, tutorialStep: 0 })
      expect(responseLargeId.status).toBe(500)

      const responseLargeStep = await userWithSocket.socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 0, tutorialStep: 1000000 })
      expect(responseLargeStep.status).toBe(500)
    })

    test('Tutorial step should be loaded for authenticated user', async () => {
      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 0, tutorialStep: 0 })
      expect(response.status).toBe(200)
      expect(response.data?.config != null).toBe(true)
      expect(response.data).toMatchSnapshot()
    })

    test('Tutorial step should be loaded for unauthenticated user', async () => {
      const response = await socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 0, tutorialStep: 1 })
      expect(response.status).toBe(200)
      expect(response.data?.config != null).toBe(true)
      expect(response.data?.goal != null).toBe(true)
      expect(response.data).toMatchSnapshot()
    })

    test('Move should be able to be performed', async () => {
      const responseForData = await socket.emitWithAck(5000, 'tutorial:load', { tutorialID: 0, tutorialStep: 3 })
      const data = responseForData.data
      if (data == null) {
        throw new Error('')
      }

      const responseInvalid = await userWithSocket.socket.emitWithAck(5000, 'tutorial:postMove', { game: data.game, move: [0, 1, 0, 60] })
      expect(responseInvalid.status).toBe(500)

      const response = await userWithSocket.socket.emitWithAck(5000, 'tutorial:postMove', { game: data.game, move: [0, 1, 0, 16] })
      expect(response.status).toBe(200)
      expect(response.data).toMatchSnapshot()
    })
  })
})
