/** @type {import("prettier").Options} */
const config = {
  trailingComma: "es5",
  tabWidth: 2,
  quoteProps: "preserve",
  semi: true,
  proseWrap: "always",
  plugins: ["prettier-plugin-css-order"],
  cssDeclarationSorterKeepOverrides: false,
};

module.exports = config;
