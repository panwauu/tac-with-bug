import { defineStore } from 'pinia'

// Additional information:
// To avoid flickering on initial load, there is an inline script in index.html that sets the class based on localstorage and system preference

export type ColorScheme = 'light' | 'dark' | 'system'

function setColorSchemeInStorage(scheme: ColorScheme) {
  if (scheme === 'light' || scheme === 'dark') {
    localStorage.setItem('color-scheme', scheme)
  } else {
    localStorage.removeItem('color-scheme')
  }
}

function applyColorSchemeClass(scheme: ColorScheme) {
  document.documentElement.classList.remove('tac-with-bug-dark')

  if (scheme === 'dark') {
    document.documentElement.classList.add('tac-with-bug-dark')
  } else if (scheme === 'system') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('tac-with-bug-dark')
    }
  }
}

export const useColorSchemeStore = defineStore('colorScheme', {
  state: () => {
    let stored = localStorage.getItem('color-scheme') as ColorScheme | null
    let colorScheme: ColorScheme = 'system'

    if (stored === 'light' || stored === 'dark') {
      colorScheme = stored
    }
    applyColorSchemeClass(colorScheme)

    return { colorScheme }
  },
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

      // Persist only light/dark, remove for system
      setColorSchemeInStorage(scheme)

      // Apply css
      applyColorSchemeClass(scheme)
    },
  },
})
