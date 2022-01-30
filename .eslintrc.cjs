module.exports = {
    root: true,
    plugins: ["requirejs", "react"],
    extends: [
        "eslint:recommended",
        "plugin:requirejs/recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
    ],
    globals: {
        dojoConfig: "readonly",
        ngwConfig: "readonly",
    },
    rules: {
        "no-unused-vars": ["error", { args: "all" }],
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
            parserOptions: {
                sourceType: "module",
                jsx: true,
            },
        },
        {
            files: ["*/*/amd/**/*.js", "*/amd_packages/**/*.js"],
            env: {
                browser: true,
                amd: true,
            },
        },
    ],
};
