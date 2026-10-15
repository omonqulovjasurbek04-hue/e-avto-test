import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The two classic hook rules catch real bugs (conditional hooks, stale dependencies).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Never render unsanitised HTML by accident: the single audited place is components/common/SafeHtml.tsx.
      "no-restricted-syntax": ["error", { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Use <SafeHtml> (sanitised) instead of dangerouslySetInnerHTML." }],
    },
  },
  {
    files: ["src/components/common/SafeHtml.tsx"],
    rules: { "no-restricted-syntax": "off" },
  }
);
