import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { globalIgnores } from 'eslint/config'
import SonarConfig from 'eslint-plugin-sonarjs'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'src/generatedClient/*']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strict,
  SonarConfig.configs.recommended,
  skipFormatting,

  {
    rules: {
      'no-trailing-spaces': 'error',
      'max-len': ['error', { code: 180 }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-duplicate-imports': 'error',

      /* Maybe remove in future */
      'vue/no-v-html': 0,
      'no-shadow': ['error'],
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/no-extra-semi': 0,
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/constructor-for-side-effects': 'off',
      'sonarjs/slow-regex': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/sql-queries': 'off',
      'sonarjs/updated-loop-counter': 'off',
      'sonarjs/use-type-alias': 'off',
      'sonarjs/no-nested-assignment': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/redundant-type-aliases': 'off',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/no-commented-code': 'off',
      'sonarjs/no-dead-store': 'off',
    },
  }
)

/*
module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  plugins: ['sonarjs'],
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'plugin:sonarjs/recommended', '@vue/typescript/recommended'],
}
*/
