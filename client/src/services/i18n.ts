import { computed, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import router from '../router/index'
import de from '../locales/de.json'
import { locales, fallbackLocale } from '@/../../server/src/sharedDefinitions/locales'

export function getLocaleFromBrowser(): string {
  let browserLocales = navigator.languages ?? [navigator.language]

  if (!browserLocales) {
    return fallbackLocale
  }

  browserLocales = browserLocales.map((locale) => {
    return locale.trim().split(/-|_/)[0]
  })

  for (const locale of browserLocales) {
    if (locales.some((l) => l === locale)) {
      return locale
    }
  }

  return fallbackLocale
}

export function redirectDepedingOnLoadedLocale(locale: string): void {
  if ((router.currentRoute.value.params.locale === undefined && locale !== fallbackLocale) || locale !== router.currentRoute.value.params.locale) {
    router.push({
      name: router.currentRoute.value.name != null ? router.currentRoute.value.name.toString() : 'Landing',
      params: { ...router.currentRoute.value.params, ...{ locale: locale } },
      query: router.currentRoute.value.query,
    })
  }
}

export const i18n = createI18n({
  messages: { de: de },
  fallbackLocale: fallbackLocale,
  locale: getLocaleFromBrowser(),
  allowComposition: true,
})

export const currentLocale = computed<string>(() => {
  return typeof i18n.global.locale === 'string' ? i18n.global.locale : (i18n.global.locale as any).value
})

export async function loadLocaleMessages(locale: string): Promise<void> {
  const messages = await import(`../locales/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default)

  return nextTick()
}

export async function setLocaleAndLoadMessages(locale: string): Promise<void> {
  if (!(i18n.global.availableLocales as any).includes(locale)) {
    await loadLocaleMessages(locale)
  }

  setI18nLanguage(locale)
}

export function setI18nLanguage(locale: string): void {
  if (i18n.mode === 'legacy') {
    ;(i18n.global as any).locale = locale
  } else {
    ;(i18n.global.locale as any).value = locale
  }
  document?.querySelector('html')?.setAttribute('lang', locale)
}
