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
        "prettier/prettier": "warn",
        "react/prop-types": "off", // Use TypeScript instead
        "react/jsx-no-target-blank": "off", // Unsupported browsers
        "requirejs/no-object-define": "error",
        "requirejs/amd-function-arity": [
            "error",
            { allowExtraDependencies: true },
        ],

        "no-restricted-imports": [
            "error",
            {
                "paths": [
                    {
                        "name": "lodash",
                        "message": "Use 'lodash-es' instead 'lodash'.",
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
    },
    ignorePatterns: ["doc/", "contrib/", "dist/", "node_modules/", "env/lib/"],
    overrides: [
        {
            files: "*.cjs",
            env: {
                node: true,
                es2020: true,
            },
        },
        {
            files: "*.js",
            env: {
                browser: true,
            },
        },
        {
            files: expcomp("nodepkg/**/*.js"),
            env: {
                browser: true,
                es2020: true,
            },
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
            },
            parserOptions: {
                sourceType: "module",
                jsx: true,
                babelOptions: {
                    configFile: babelConfigPath,
                },
            },
        },
        {
            files: expcomp("amd/**/*.js"),
            plugins: ["requirejs"],
            extends: ["eslint:recommended", "plugin:requirejs/recommended"],
            env: {
                browser: true,
                amd: true,
                es2015: true,
            },
            rules: {
                "eqeqeq": "warn",
            },
        },
    ],
    settings: {
        react: {
            version: "17",
        },
    },
};

module.exports = config;
