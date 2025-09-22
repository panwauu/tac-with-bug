import { defineConfig, globalIgnores } from "eslint/config";
import sonarjs from "eslint-plugin-sonarjs";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const baseConfig = defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/dist-ssr/**",
    "**/coverage/**",
    "**/src/generatedClient/*",
  ]),

  // Shared general rules
  {
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      "max-len": ["error", { code: 180 }],
      "no-duplicate-imports": "error",
      "no-throw-literal": "error",
      curly: ["error", "multi-line", "consistent"],
      "no-trailing-spaces": "error",
    },
  },

  // Shared sonarjs rules
  sonarjs.configs.recommended,
  {
    rules: {
      "sonarjs/cognitive-complexity": ["warn", 20],
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/no-identical-functions": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/pseudo-random": "off",
      "sonarjs/constructor-for-side-effects": "off",
      "sonarjs/slow-regex": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/no-os-command-from-path": "off",
      "sonarjs/sql-queries": "off",
      "sonarjs/updated-loop-counter": "off",
      "sonarjs/use-type-alias": "off",
      "sonarjs/no-nested-assignment": "off",
      "sonarjs/no-nested-conditional": "off",
      "sonarjs/redundant-type-aliases": "off",
      "sonarjs/no-ignored-exceptions": "off",
      "sonarjs/no-commented-code": "off",
      "sonarjs/no-dead-store": "off",
    },
  },
]);
