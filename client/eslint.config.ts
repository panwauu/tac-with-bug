import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { globalIgnores } from 'eslint/config'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strict,
  skipFormatting,

  globalIgnores(['src/generatedClient/*']),
  {
    rules: {
      'no-trailing-spaces': 'error',
      'max-len': ['error', { code: 180 }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-duplicate-imports': 'error',

      /* Maybe remove in future */
      'no-shadow': ['warn'],
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      '@typescript-eslint/no-invalid-void-type': 0,
      '@typescript-eslint/no-extra-semi': 0,
      'sonarjs/no-duplicate-string': 0,
      'sonarjs/cognitive-complexity': 0,
      'sonarjs/no-identical-functions': 0,
      'sonarjs/no-duplicated-branches': 0,
      'vue/no-v-html': 0,
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
  ignorePatterns: ['src/generatedClient/*'],
}
*/
