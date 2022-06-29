module.exports = {
    root: true,
    env: {
        es2021: true,
    },
    plugins: [
        'sonarjs'
    ],
    extends: [
        'eslint:recommended',
        'plugin:vue/vue3-recommended',
        'plugin:sonarjs/recommended',
        "@vue/typescript/recommended",
    ],
    rules: {
        'no-trailing-spaces': 'error',
        'quotes': ['error', 'single'],
        'eol-last': ['error', 'always'],

        /* Maybe remove in future */
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/ban-ts-comment': 0,
        'sonarjs/no-duplicate-string': 0,
        'sonarjs/cognitive-complexity': 0,
        'sonarjs/no-identical-functions': 0,
        'sonarjs/no-duplicated-branches': 0,
        'vue/attribute-hyphenation': 0,
        'vue/v-on-event-hyphenation': 0,
        'vue/max-attributes-per-line': 0, // Conflict with prettier
        'vue/singleline-html-element-content-newline': 0, // Conflict with prettier
        'vue/multiline-html-element-content-newline': 0, // Conflict with prettier
        'vue/no-v-html': 0,
    },
    globals: {
        defineProps: "readonly",
        defineEmits: "readonly",
        defineExpose: "readonly",
    },
    ignorePatterns: ['src/generatedClient/*'],
}