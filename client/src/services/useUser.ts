import router from '@/router'
import { reactive, computed, readonly } from 'vue'
import { OpenAPI } from '../generatedClient/index'
import type { GeneralSocketC } from './socket'

interface User {
  username: string
  token: string
}

interface EmptyUser {
  username: null
  token: null
}

const defaultState: EmptyUser = Object.freeze({
  username: null,
  token: null,
})

const _user = reactive<User | EmptyUser>(Object.assign({}, defaultState))
loadInitially()

function loadInitially() {
  const storageString = sessionStorage.getItem('TacUserStorage')
  if (storageString === null) {
    return setUser(defaultState)
  }

  const obj = JSON.parse(storageString)
  if (typeof obj.username !== 'string' || obj.username === '' || typeof obj.token !== 'string' || obj.token === '') {
    return setUser(defaultState)
  }

  setUser({ username: obj.username, token: obj.token })
}

function setUser(user: User | EmptyUser): void {
  _user.username = user.username
  _user.token = user.token
  OpenAPI.TOKEN = user.token ?? ''
  sessionStorage.setItem('TacUserStorage', JSON.stringify(user))
}

export function login(user: User): void {
  setUser(user)
}
export async function logout(socket: GeneralSocketC) {
  delete (socket.auth as any).token
  await socket.emitWithAck(5000, 'logout')
  setUser(defaultState)
  router.push({ name: 'Advertisement' })
}

export const user = readonly(_user)
export const username = computed(() => user.username)
export const token = computed(() => user.token)

export const isLoggedIn = computed(() => _user.username !== '' && _user.username != null)
