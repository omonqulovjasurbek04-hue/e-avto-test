import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "storage", "scripts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts", "prisma/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // Raw SQL must stay parameterised: only the tagged-template forms ($queryRaw`...`) are allowed.
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.property.name=/^[$](queryRawUnsafe|executeRawUnsafe)$/]", message: "Unsafe raw SQL is not allowed; use the tagged-template form." },
      ],
    },
  }
);
