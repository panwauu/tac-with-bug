import { defineStore } from 'pinia'

export type ColorScheme = 'light' | 'dark' | 'system'

function applyColorScheme(scheme: ColorScheme) {
  document.documentElement.classList.remove('tac-with-bug-dark')

  if (scheme === 'dark') {
    document.documentElement.classList.add('tac-with-bug-dark')
    localStorage.setItem('color-scheme', 'dark')
  } else if (scheme === 'light') {
    localStorage.setItem('color-scheme', 'light')
  } else {
    localStorage.removeItem('color-scheme')
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('tac-with-bug-dark')
    }
  }
}

export const useColorSchemeStore = defineStore('colorScheme', {
  state: () => ({
    colorScheme: (localStorage.getItem('color-scheme') as ColorScheme) || 'system',
  }),
  getters: {
    isDark(state): boolean {
      if (state.colorScheme === 'dark') return true
      if (state.colorScheme === 'system') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return false
    },
    isLight(state): boolean {
      if (state.colorScheme === 'light') return true
      if (state.colorScheme === 'system') {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      }
      return false
    },
  },
  actions: {
    setColorScheme(scheme: ColorScheme) {
      this.colorScheme = scheme
      applyColorScheme(scheme)
    },
  },
})
