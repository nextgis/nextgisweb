module.exports = {
    root: true,
    extends: ["eslint:recommended"],
    globals: {
        dojoConfig: "readonly",
        ngwConfig: "readonly",
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
