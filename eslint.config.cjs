// @ts-check

const babelParser = require("@babel/eslint-parser");
const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import-x");
const prettierRecommended = require("eslint-plugin-prettier/recommended");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const globals = require("globals");
const tseslint = require("typescript-eslint");

const babelConfigPath = require.resolve("@nextgisweb/jsrealm/babelrc.cjs");

const browserGlobals = { ...globals.browser };
// @ts-expect-error use this fix because CKEditor installs old version of globals with this bug
delete browserGlobals["AudioWorkletGlobalScope "];

const expcomp = (pattern) => [
    `nextgisweb/*/${pattern}`,
    `**/nextgisweb_*/nextgisweb_*/**/${pattern}`,
];

const noUnusedVarsOptions = {
    args: "after-used",
    vars: "all",
    ignoreRestSiblings: true,
    varsIgnorePattern: "^_",
    argsIgnorePattern: "^_",
    destructuredArrayIgnorePattern: "^_",
};

module.exports = tseslint.config(
    { ignores: ["doc/", "contrib/", "dist/", "node_modules/", "env/lib/"] },

    js.configs.recommended,
    tseslint.configs.recommended,

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
            "no-use-before-define": "warn",
            "no-useless-escape": "warn",
        },
    },

    prettierRecommended,
    {
        rules: {
            "prettier/prettier": "warn",
        },
    },

    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat["jsx-runtime"],
    reactHooksPlugin.configs["recommended-latest"],
    {
        plugins: {
            react: reactPlugin,
        },
        rules: {
            "react/prop-types": "off", // Use TypeScript instead
            "react/jsx-no-target-blank": "off", // Unsupported browsers
            "react/display-name": "warn",
        },
        settings: {
            react: { version: "19" },
            componentWrapperFunctions: ["observer"],
        },
    },
    {
        files: ["**/*.cjs"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: {
                ...browserGlobals,
            },
        },
    },
    {
        files: expcomp("nodepkg/**/*.js"),
        languageOptions: {
            globals: {
                ...browserGlobals,
            },
            parser: babelParser,
            parserOptions: {
                sourceType: "module",
                requireConfigFile: true,
                babelOptions: { configFile: babelConfigPath },
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2020,
            },
        },
    },
    {
        files: [...expcomp("nodepkg/**/*.ts"), ...expcomp("nodepkg/**/*.tsx")],
        languageOptions: {
            globals: {
                ...browserGlobals,
            },

            parser: tseslint.parser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2020,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
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
            "@typescript-eslint/consistent-type-imports": "warn",
            "no-use-before-define": "warn",
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
                            importNames: [
                                "makeAutoObservable",
                                "makeObservable",
                                "toJS",
                            ],
                            message: "Don't use this API and use decorators",
                        },
                    ],
                    patterns: [
                        {
                            group: [
                                "**/nextgisweb*/*/nodepkg/*",
                                "**/nextgisweb*/nodepkg/*",
                            ],
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
            "sort-imports": ["warn", { ignoreDeclarationSort: true }],
            "import-x/no-duplicates": "warn",
            "import-x/consistent-type-specifier-style": [
                "warn",
                "prefer-top-level",
            ],
            "import-x/first": "warn",
            "import-x/newline-after-import": "warn",
            "import-x/no-unresolved": [
                "error",
                {
                    ignore: [
                        "^@nextgisweb/icon/",
                        "@nextgisweb/cadaster/icon/",
                    ],
                },
            ],
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
            "import/parsers": {
                "@typescript-eslint/parser": [".ts", ".tsx"],
            },
            "import/resolver": {
                typescript: {
                    alwaysTryTypes: true,
                    project: "path/to/folder",
                },
            },
            "import-x/internal-regex": "^@nextgisweb/",
        },
    }
);
