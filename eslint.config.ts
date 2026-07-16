import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import { importX as importPlugin } from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import * as tseslint from "typescript-eslint";

const tsconfigRootDir = import.meta.dirname;

const reactFiles = ["**/nodepkg/**/*.{ts,tsx}"];

/**
 * Minimum version for top level await
 */
const ecmaVersion = 2022;

const noUnusedVarsOptions = {
  args: "after-used",
  vars: "all",
  ignoreRestSiblings: true,
  varsIgnorePattern: "^_",
  argsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_",
};

const config = [
  {
    ignores: [
      "doc/",
      "contrib/",
      "dist/",
      "node_modules/",
      "env/lib/",
      "**/*.inc.{ts,d.ts}",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
      },
    },
  },

  {
    languageOptions: {
      globals: {
        ngwConfig: "readonly",
        ngwEntry: "readonly",
        ngwExternal: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      eqeqeq: "error",
      "no-unused-vars": ["error", noUnusedVarsOptions],
      "no-useless-escape": "warn",
    },
  },

  {
    files: reactFiles,
    ...eslintReact.configs["recommended-typescript"],
  },
  {
    files: reactFiles,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "@eslint-react/dom-no-unsafe-target-blank": "off", // Unsupported browsers
      "@eslint-react/no-missing-component-display-name": "warn",
      "@eslint-react/no-missing-context-display-name": "warn",

      // Disabled for backward compatibility.
      // TODO: Enable these rules as warn, and fix the code gradually.
      "@eslint-react/no-nested-component-definitions": "off",
      "@eslint-react/static-components": "warn",
      "@eslint-react/set-state-in-effect": "off",
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/naming-convention-ref-name": "off",
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion,
      sourceType: "commonjs",
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir,
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["**/nodepkg/**/*.js"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        ecmaVersion,
      },
    },
  },
  {
    files: ["**/nodepkg/**/*.ts", "**/nodepkg/**/*.tsx"],
    languageOptions: {
      globals: globals.browser,

      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir,
        ecmaFeatures: { jsx: true },
        ecmaVersion,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
      "no-unused-vars": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", noUnusedVarsOptions],
    },
  },

  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lodash",
              message: "Use 'lodash-es' instead 'lodash'.",
            },
            {
              name: "prop-types",
              message: "Use TypeScript for typing",
            },
            {
              name: "mobx",
              importNames: ["makeAutoObservable", "makeObservable", "toJS"],
              message: "Don't use this API and use decorators",
            },
          ],
          patterns: [
            {
              group: ["**/nextgisweb*/*/nodepkg/*", "**/nextgisweb*/nodepkg/*"],
              message: "Use '@nextgisweb/*' namespace instead.",
            },
            {
              group: ["./../*"],
              message: "Remove useless './' prefix.",
            },
            {
              group: ["../../../*"],
              message: "Too many levels up, use absolute name.",
            },
            {
              group: ["ant/lib", "antd/lib/*"],
              message: "Use '@nextgisweb/gui/antd' or 'antd/es'.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TSTypeReference > TSQualifiedName[left.name='React']",
          message: "Use named type imports from 'react' instead.",
        },
      ],
      "sort-imports": ["warn", { ignoreDeclarationSort: true }],
      "import-x/no-duplicates": "warn",
      "import-x/consistent-type-specifier-style": ["warn", "prefer-top-level"],
      "import-x/first": "warn",
      "import-x/newline-after-import": "warn",
      "import-x/no-unresolved": "off",
      "import-x/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            { pattern: "glob", group: "builtin" },
            { pattern: "@nextgisweb/icon/**", group: "index" },
            { pattern: "@nextgisweb/*/icon/**", group: "index" },
            { pattern: "@ant-design/icons", group: "index" },
          ],
          alphabetize: { order: "asc", orderImportKind: "desc" },
          "newlines-between": "always",
          distinctGroup: false,
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      "import-x/internal-regex": "^@nextgisweb/",
    },
  },

  // Import eslint-plugin-prettier/recommended and add it as the last item in the
  prettierRecommended,
  {
    rules: {
      "prettier/prettier": "warn",
    },
  },
];

export default config;
