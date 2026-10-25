import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Next.js's flat-config preset: React, React Hooks, jsx-a11y and the Core Web Vitals rules.
  ...nextVitals,

  {
    rules: {
      // eslint-plugin-react-hooks 7 reports this as an error. The game draws its first note in
      // an effect on purpose (a random note can't be rendered on the server without a hydration
      // mismatch), so keep it visible as a warning instead of blocking lint.
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  // ESLint already skips node_modules/ and .git/. The preset also ignores the Next.js output
  // below; they are repeated here so this file shows everything that is left out of linting.
  globalIgnores([
    ".next/",
    "out/",
    "build/",
    "next-env.d.ts",
    "coverage/",
    ".vercel/",
    ".claude/",
  ]),
]);
