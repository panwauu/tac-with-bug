import { app } from '@storybook/vue3'
import { createI18n } from 'vue-i18n'
import messages from '../src/locales/de.json'

const i18n = createI18n({
  locale: 'de',
  fallbackLocale: 'de',
  messages: { de: messages },
})

app.use(i18n)

import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import 'primevue/resources/themes/saga-blue/theme.css'
import PrimeVue from 'primevue/config'
app.use(PrimeVue)

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
