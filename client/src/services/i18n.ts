import { computed, nextTick } from 'vue';
import { createI18n, I18n } from 'vue-i18n';
import router from '../router/index';
import de from '../locales/de.json';
import { locales, fallbackLocale } from '@/../../shared/shared/locales';

export function getLocaleFromBrowser(): string {
    let browserLocales =
        navigator.languages === undefined
            ? [navigator.language]
            : navigator.languages;

    if (!browserLocales) {
        return fallbackLocale;
    }

    browserLocales = browserLocales.map(locale => {
        return locale.trim().split(/-|_/)[0];
    });

    for (const locale of browserLocales) {
        if (locales.some((l) => l === locale)) {
            return locale
        }
    }

    return fallbackLocale
}

export async function setLocaleAndLoadMessages(i18n: I18n, locale: string): Promise<void> {
    if (!i18n.global.availableLocales.includes(locale)) {
        await loadLocaleMessages(i18n, locale)
    }

    setI18nLanguage(i18n, locale)
}

export function setI18nLanguage(i18n: I18n, locale: string): void {
    if (i18n.mode === 'legacy') {
        i18n.global.locale = locale
    } else {
        (i18n.global.locale as any).value = locale
    }
    document?.querySelector('html')?.setAttribute('lang', locale)
}

export async function loadLocaleMessages(i18n: I18n, locale: string): Promise<any> {
    const messages = await import(`../locales/${locale}.json`)
    i18n.global.setLocaleMessage(locale, messages.default)

    return nextTick()
}

export function redirectDepedingOnLoadedLocale(locale: string): void {
    if ((router.currentRoute.value.params.locale === undefined && locale !== fallbackLocale) || locale !== router.currentRoute.value.params.locale) {
        router.push({
            name: router.currentRoute.value.name ? router.currentRoute.value.name : 'Landing',
            params: { ...router.currentRoute.value.params, ...{ locale: locale } },
            query: router.currentRoute.value.query,
        })
    }
}

export const i18n: I18n<any, any, any, any> = createI18n({
    messages: { de: de },
    fallbackLocale: fallbackLocale,
    locale: getLocaleFromBrowser(),
});

export const currentLocale = computed<string>(() => {
    return typeof i18n.global.locale === 'string' ? i18n.global.locale : i18n.global.locale.value
})
