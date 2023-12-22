import { readFileSync } from 'fs'
import path from 'path'
import { locales } from '../sharedDefinitions/locales.js'

const pathToLocales = process.argv.slice(2)[0] ?? './locales'
const absolutePathOfLocales = path.resolve(__dirname, pathToLocales)

console.log(`Checking Path: ${absolutePathOfLocales}`)

const localeFiles: Record<string, any> = {}
for (const locale of locales) {
  const file = readFileSync(path.resolve(absolutePathOfLocales, `${locale}.json`))
  localeFiles[locale] = JSON.parse(String(file))
}
console.log('All files found')

const defaultLocale = 'de'
const otherLocales = locales.filter((l) => l !== defaultLocale)

if (!recursiveKeyCheck([])) {
  process.exit(1)
}
console.log('All keys are matching')

function recursiveKeyCheck(keyPath: string[]): boolean {
  const defaultObj = resolveLocalePath(defaultLocale, keyPath)
  const defaultKeys = Object.keys(defaultObj)

  for (const locale of otherLocales) {
    const localeObj = resolveLocalePath(locale, keyPath)
    const localeKeys = Object.keys(localeObj)
    if (localeKeys.length !== defaultKeys.length) {
      console.log(`Locale "${locale}" differs from "${defaultLocale}": has more keys`)
      return false
    }

    for (const key of defaultKeys) {
      if (!localeKeys.includes(key)) {
        console.log(`Locale "${locale}" differs from "${defaultLocale}": "${[...keyPath, key].join('.')}" is missing`)
        return false
      }
    }
  }

  for (const key of defaultKeys) {
    if (typeof defaultObj[key] !== 'string' && !recursiveKeyCheck([...keyPath, key])) {
      return false
    }
  }

  return true
}

function resolveLocalePath(locale: string, keyPath: string[]) {
  let obj = localeFiles[locale]
  for (const key of keyPath) {
    obj = obj[key]
  }
  return obj
}
