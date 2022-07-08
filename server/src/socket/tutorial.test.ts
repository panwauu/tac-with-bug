import type { AckData, GeneralSocketC } from '../sharedTypes/GeneralNamespaceDefinition'
import { io } from 'socket.io-client'
import { TutorialStepOutput } from '../sharedTypes/typesTutorial'
import { GameForPlay, UpdateDataType } from '../sharedTypes/typesDBgame'
import { getUsersWithSockets, UserWithSocket } from '../test/handleUserSockets'
import { closeSockets } from '../test/handleSocket'

describe('Tutorial Test Suite via Socket.io', () => {
  describe('Test Tutorials', () => {
    let userWithSocket: UserWithSocket, socket: GeneralSocketC

    beforeAll(async () => {
      userWithSocket = (await getUsersWithSockets({ n: 1 }))[0]
      socket = io('http://localhost:1234') as any
      await new Promise((resolve) => {
        socket.on('connect', () => {
          resolve(null)
        })
      })
    })

    afterAll(async () => {
      await closeSockets([userWithSocket, socket])
    })

    test('On connection the tutorial progress should be sent to unauthenticated client', async () => {
      const disconnectPromise = new Promise((resolve) =>
        socket.once('disconnect', () => {
          resolve(null)
        })
      )
      socket.disconnect()
      await disconnectPromise

      const promise = new Promise((resolve) => socket.once('tutorial:loadProgress', (progress) => resolve(progress)))

      const connectPromise = new Promise((resolve) => {
        socket.on('connect', () => {
          resolve(null)
        })
      })
      socket.connect()
      await connectPromise

      const progress = await promise
      expect(progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('On connection the tutorial progress should be sent to authenticated client', async () => {
      const disconnectPromise = new Promise((resolve) =>
        userWithSocket.socket.once('disconnect', () => {
          resolve(null)
        })
      )
      userWithSocket.socket.disconnect()
      await disconnectPromise

      const promise = new Promise((resolve) => userWithSocket.socket.once('tutorial:loadProgress', (progress) => resolve(progress)))

      const connectPromise = new Promise((resolve) => {
        userWithSocket.socket.on('connect', () => {
          resolve(null)
        })
      })
      userWithSocket.socket.connect()
      await connectPromise

      const progress = await promise
      expect(progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('On login and logout the tutorial progress should be sent to authenticated client', async () => {
      const promiseLogout = new Promise((resolve) => userWithSocket.socket.once('tutorial:loadProgress', (progress) => resolve(progress)))
      const logoutData = await new Promise<AckData<null>>((resolve) =>
        userWithSocket.socket.emit('logout', (data) => {
          resolve(data)
        })
      )
      expect(logoutData.status).toBe(200)
      await promiseLogout
      expect(await promiseLogout).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])

      const promiseLogin = new Promise((resolve) => userWithSocket.socket.once('tutorial:loadProgress', (progress) => resolve(progress)))
      const loginData = await new Promise<AckData<null>>((resolve) =>
        userWithSocket.socket.emit('login', { token: userWithSocket.token }, (data) => {
          resolve(data)
        })
      )
      expect(loginData.status).toBe(200)
      await promiseLogin
      expect(await promiseLogin).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should not be saved with missing data', async () => {
      const responseWithoutDone = await new Promise<AckData<any>>((resolve) =>
        (userWithSocket.socket as any).emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0 }, (data: any) => {
          resolve(data)
        })
      )
      expect(responseWithoutDone.status).toBe(500)
      expect(responseWithoutDone.error.details[0].message).toContain('done')

      const responseWithoutID = await new Promise<AckData<any>>((resolve) =>
        (userWithSocket.socket as any).emit('tutorial:changeTutorialStep', { tutorialStep: 0, done: false }, (data: any) => {
          resolve(data)
        })
      )
      expect(responseWithoutID.status).toBe(500)
      expect(responseWithoutID.error.details[0].message).toContain('tutorialID')

      const responseWithoutStep = await new Promise<AckData<any>>((resolve) =>
        (userWithSocket.socket as any).emit('tutorial:changeTutorialStep', { tutorialID: 0, done: false }, (data: any) => {
          resolve(data)
        })
      )
      expect(responseWithoutStep.status).toBe(500)
      expect(responseWithoutStep.error.details[0].message).toContain('tutorialStep')
    })

    test('Progress should not be saved with invalid ID or Step', async () => {
      const responseInvalidID = await new Promise<AckData<any>>((resolve) =>
        userWithSocket.socket.emit('tutorial:changeTutorialStep', { tutorialID: 1000, tutorialStep: 0, done: true }, (data: any) => {
          resolve(data)
        })
      )
      expect(responseInvalidID.status).toBe(500)
      expect(responseInvalidID.error).toEqual('TUTORIAL_ID_NOT_VALID')

      const responseInvalidStep = await new Promise<AckData<any>>((resolve) =>
        userWithSocket.socket.emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 1000, done: true }, (data: any) => {
          resolve(data)
        })
      )
      expect(responseInvalidStep.status).toBe(500)
      expect(responseInvalidStep.error).toEqual('TUTORIAL_STEP_NOT_VALID')
    })

    test('Progress should not be saved if not authenticated', async () => {
      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        socket.emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(500)
    })

    test('Progress should be saved for valid data - set to true', async () => {
      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[true, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be saved for valid data - set to false', async () => {
      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: false }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be saved for valid data - set to true', async () => {
      const setRes = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:changeTutorialStep', { tutorialID: 0, tutorialStep: 0, done: true }, (data) => {
          resolve(data)
        })
      )
      expect(setRes.status).toBe(200)
      expect(setRes.data?.progress).toEqual([[true, false, false, false, false, false, false, false, false, false, false]])

      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:resetTutorial', { tutorialID: 0 }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be loaded with changed values for authenticated user', async () => {
      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:loadProgress', (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Progress should be loaded for unauthenticated user', async () => {
      const response = await new Promise<AckData<{ progress: boolean[][] }>>((resolve) =>
        socket.emit('tutorial:loadProgress', (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.progress).toEqual([[false, false, false, false, false, false, false, false, false, false, false]])
    })

    test('Tutorial step should be loaded for authenticated user', async () => {
      const response = await new Promise<AckData<TutorialStepOutput>>((resolve) =>
        userWithSocket.socket.emit('tutorial:load', { tutorialID: 0, tutorialStep: 0 }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.config != null).toBe(true)
      expect(response.data).toMatchSnapshot()
    })

    test('Tutorial step should be loaded for unauthenticated user', async () => {
      const response = await new Promise<AckData<TutorialStepOutput>>((resolve) =>
        socket.emit('tutorial:load', { tutorialID: 0, tutorialStep: 1 }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data?.config != null).toBe(true)
      expect(response.data?.goal != null).toBe(true)
      expect(response.data).toMatchSnapshot()
    })

    test('Move should be able to be performed', async () => {
      const responseForData = await new Promise<AckData<TutorialStepOutput>>((resolve) =>
        socket.emit('tutorial:load', { tutorialID: 0, tutorialStep: 3 }, (data) => {
          resolve(data)
        })
      )
      const data = responseForData.data
      if (data == null) {
        throw new Error('')
      }

      const responseInvalid = await new Promise<AckData<{ game: GameForPlay; updateData: UpdateDataType }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:postMove', { game: data.game, move: [0, 1, 0, 60] }, (data) => {
          resolve(data)
        })
      )
      expect(responseInvalid.status).toBe(500)

      const response = await new Promise<AckData<{ game: GameForPlay; updateData: UpdateDataType }>>((resolve) =>
        userWithSocket.socket.emit('tutorial:postMove', { game: data.game, move: [0, 1, 0, 16] }, (data) => {
          resolve(data)
        })
      )
      expect(response.status).toBe(200)
      expect(response.data).toMatchSnapshot()
    })
  })
})
