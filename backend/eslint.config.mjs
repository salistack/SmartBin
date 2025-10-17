import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      "no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "single"],
      "indent": ["error", 2],
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "comma-dangle": ["error", "never"],
      "no-multiple-empty-lines": ["error", { "max": 1 }],
      "space-before-function-paren": ["error", "never"],
      "keyword-spacing": "error",
      "space-infix-ops": "error",
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "brace-style": ["error", "1tbs"],
      "camelcase": ["error", { "properties": "never" }]
    }
  }
];
