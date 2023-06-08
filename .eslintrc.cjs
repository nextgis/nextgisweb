const babelConfigPath = require.resolve('@nextgisweb/jsrealm/babelrc.cjs');

module.exports = {
    root: true,
    plugins: ["requirejs", "react"],
    extends: [
        "eslint:recommended",
        "plugin:requirejs/recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
    ],
    globals: {
        dojoConfig: "readonly",
        ngwConfig: "readonly",
    },
    rules: {
        "eqeqeq": "error",
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "no-unused-vars": ["error", { args: "after-used" }],
        "no-use-before-define": "error",
        "requirejs/no-object-define": "error",
        "requirejs/one-dependency-per-line": ["error"],
        "requirejs/amd-function-arity": [
            "error",
            { allowExtraDependencies: true },
        ],
        "requirejs/no-restricted-amd-modules": [
            "error",
            {
                name: "ngw/route",
                message: "Use '@nextgisweb/pyramid/api' instead!",
            },
            {
                name: "ngw/load-json",
                message: "Use '@nextgisweb/pyramid/api/load' instead!",
            },
            {
                name: "ngw-pyramid/i18n",
                message: "Use '@nextgisweb/pyramid/i18n' instead!",
            },
            {
                name: "ngw-pyramid/hbs-i18n",
                message: "Use '@nextgisweb/pyramid/i18n' instead!",
            },
            {
                name: "ngw/settings",
                message: "Use '@nextgisweb/pyramid/settings' instead!",
            },
        ],
    },
    ignorePatterns: ["*/amd_packages/contrib/", "doc/"],
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
            files: ["*/*/nodepkg/**/*.js"],
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
            files: ["*/*/amd/**/*.js", "*/amd_packages/**/*.js"],
            env: {
                browser: true,
                amd: true,
            },
            rules: {
                "eqeqeq": "off",
            }
        },
    ],
};
