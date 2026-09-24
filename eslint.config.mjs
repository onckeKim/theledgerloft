import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Threat T7: never render raw HTML (user text could carry script).
      "react/no-danger": "error",
      // Money is integer cents: parseFloat on user input is a bug waiting to happen.
      "no-restricted-globals": [
        "error",
        { name: "parseFloat", message: "Parse money with parseRandToCents() from @/lib/money." },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
