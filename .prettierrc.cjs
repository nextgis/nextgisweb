/** @type {import("prettier").Options} */
const config = {
    trailingComma: "es5",
    tabWidth: 4,
    quoteProps: "preserve",
    semi: true,
    proseWrap: "always",
    plugins: ["prettier-plugin-css-order"],
    cssDeclarationSorterKeepOverrides: false,
};

module.exports = config;
