import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // reference/ is the vendored Musy design system — consumed, never amended,
  // so it is not held to this app's lint rules.
  { ignores: ["dist", "reference", "public/pcm-worklet.js"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
    ],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
  },
);
