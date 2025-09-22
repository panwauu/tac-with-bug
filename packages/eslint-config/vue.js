import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";
import { baseConfig } from "./base.js";

/**
 * A shared ESLint configuration for vue packages.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const vueConfig = defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },

  pluginVue.configs["flat/recommended"],
  vueTsConfigs.strict,
  ...baseConfig,
  skipFormatting,

  // Rules to enable in the future
  {
    rules: {
      "vue/no-v-html": 0,
      "no-shadow": ["error"],
      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/ban-ts-comment": 0,
      "@typescript-eslint/no-extra-semi": 0,
    },
  }
);
