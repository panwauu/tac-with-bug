module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'sonarjs'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'plugin:@typescript-eslint/recommended', 'plugin:sonarjs/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  rules: {
    'no-throw-literal': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'max-len': ['error', { code: 180 }],
    curly: ['error', 'multi-line', 'consistent'],
    'no-duplicate-imports': 'error',

    // Enable in the future?
    'no-param-reassign': ['off', { props: true }],
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    'sonarjs/cognitive-complexity': ['warn', 20],
    'sonarjs/no-duplicate-string': 0,
    'sonarjs/no-identical-functions': 0,
  },
}
