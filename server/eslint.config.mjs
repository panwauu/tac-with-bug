import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  {
    rules: {
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
  },
  eslintConfigPrettier,
  {
    rules: {
      'no-throw-literal': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'max-len': ['error', { code: 180 }],
      curly: ['error', 'multi-line', 'consistent'],
      'no-duplicate-imports': 'error',

      // Enable in the future?
      'no-shadow': ['warn'],
      'no-param-reassign': ['off', { props: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
]
