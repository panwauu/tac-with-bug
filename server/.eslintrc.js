module.exports = {
    'env': {
        'node': true,
        'es2021': true
    },
    'parser': '@typescript-eslint/parser',
    'plugins': [
        '@typescript-eslint',
        'sonarjs'
    ],
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:sonarjs/recommended'
    ],
    'parserOptions': {
        'ecmaVersion': 13,
        'sourceType': 'module'
    },
    'rules': {
        'no-trailing-spaces': 'error',
        'quotes': ['error', 'single'],
        'no-throw-literal': 'error',
        'eol-last': ['error', 'always'],
        'eqeqeq': ['error', 'always', { 'null': 'ignore' }],

        // Enable in the future?
        'no-param-reassign': ['off', { 'props': true }],
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/ban-ts-comment': 0,
        'sonarjs/cognitive-complexity': ['warn', 20],
        'sonarjs/no-duplicate-string': 0,
        'max-len': ['warn', { 'code': 180 }],
        'max-statements-per-line': ['warn', { 'max': 2 }],
    }
};
