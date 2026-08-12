import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Règles React Compiler — dette existante (fetch dans useEffect, etc.)
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "dist/**",
    "dist2/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "electron/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
