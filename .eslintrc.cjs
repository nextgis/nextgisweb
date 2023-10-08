const babelConfigPath = require.resolve("@nextgisweb/jsrealm/babelrc.cjs");

const expcomp = (pattern) => [
    `nextgisweb/*/${pattern}`,
    `**/nextgisweb_*/nextgisweb_*/**/${pattern}`,
];

/** @type {import("eslint").Linter.Config } */
const config = {
    root: true,
    plugins: ["requirejs", "react", "prettier", "import"],
    extends: [
        "eslint:recommended",
        "plugin:requirejs/recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended",
    ],
    globals: {
        dojoConfig: "readonly",
        ngwConfig: "readonly",
    },
    rules: {
        "eqeqeq": "error",
        "no-unused-vars": [
            "error",
            { args: "after-used", destructuredArrayIgnorePattern: "^_" },
        ],
        "no-use-before-define": "warn",
        "no-useless-escape": "warn",
        "no-restricted-imports": [
            "error",
            {
                "paths": [
                    {
                        "name": "lodash",
                        "message": "Use 'lodash-es' instead 'lodash'.",
                    },
                    {
                        "name": "prop-types",
                        "message": "Use TypeScript for typing",
                    },
                ],
                "patterns": [
                    {
                        "group": ["lodash/*"],
                        "message":
                            "Use 'lodash-es/[util]' instead 'lodash/[util]'.",
                    },
                ],
            },
        ],
        "sort-imports": ["warn", { "ignoreDeclarationSort": true }],
        "@typescript-eslint/consistent-type-imports": "warn",
        "import/consistent-type-specifier-style": ["warn", "prefer-top-level"],
        "import/first": "warn",
        "import/newline-after-import": "warn",
        "import/order": [
            "warn",
            {
                "groups": [
                    "builtin",
                    "external",
                    "internal",
                    "parent",
                    "sibling",
                    "index",
                ],
                "pathGroups": [
                    { pattern: "glob", group: "builtin" },
                    { pattern: "@nextgisweb/icon/**", group: "index" },
                    { pattern: "@ant-design/icons", group: "index" },
                ],
                "alphabetize": { order: "asc", orderImportKind: "desc" },
                "newlines-between": "always",
                "distinctGroup": false,
                "pathGroupsExcludedImportTypes": ["builtin"],
            },
        ],
        "prettier/prettier": "warn",
        "react/prop-types": "off", // Use TypeScript instead
        "react/jsx-no-target-blank": "off", // Unsupported browsers
        "requirejs/no-object-define": "error",
        "requirejs/amd-function-arity": [
            "error",
            { allowExtraDependencies: true },
        ],
    },
    ignorePatterns: ["doc/", "contrib/", "dist/", "node_modules/", "env/lib/"],
    overrides: [
        {
            files: "*.cjs",
            env: { node: true, es2020: true },
        },
        {
            files: "*.js",
            env: { browser: true },
        },
        {
            files: expcomp("nodepkg/**/*.js"),
            env: { browser: true, es2020: true },
            parser: "@babel/eslint-parser",
            parserOptions: {
                sourceType: "module",
                jsx: true,
                babelOptions: {
                    configFile: babelConfigPath,
                },
            },
        },
        {
            files: [
                ...expcomp("nodepkg/**/*.ts"),
                ...expcomp("nodepkg/**/*.tsx"),
            ],
            parser: "@typescript-eslint/parser",
            plugins: ["react", "@typescript-eslint", "prettier"],
            extends: [
                "eslint:recommended",
                "plugin:@typescript-eslint/recommended",
                "plugin:react/recommended",
                "plugin:react/jsx-runtime",
                "plugin:react-hooks/recommended",
                "plugin:prettier/recommended",
            ],
            rules: {
                "prettier/prettier": "warn",
                "@typescript-eslint/no-explicit-any": "warn",
            },
            parserOptions: {
                sourceType: "module",
                jsx: true,
                babelOptions: { configFile: babelConfigPath },
            },
        },
        {
            files: expcomp("amd/**/*.js"),
            plugins: ["requirejs"],
            extends: ["eslint:recommended", "plugin:requirejs/recommended"],
            env: { browser: true, amd: true, es2015: true },
            rules: {
                "eqeqeq": "warn",
                "no-useless-escape": "warn",
            },
        },
    ],
    settings: {
        "react": { version: "18" },
        "import/internal-regex": "^(@nextgisweb/|ngw-)",
    },
};

module.exports = config;
