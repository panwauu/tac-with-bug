import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { baseConfig } from "./base.js";
import eslintConfigPrettier from "eslint-config-prettier/flat";

/**
 * A shared ESLint configuration for the server packages.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const serverConfig = [
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...baseConfig,
  eslintConfigPrettier,

  // Rules to enable in the future
  {
    rules: {
      "no-shadow": ["warn"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
    },
  },
];
