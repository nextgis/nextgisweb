const config = require("./config.cjs");

module.exports = {
  "sourceType": "unambiguous",
  "presets": [
    ["@babel/preset-typescript", {}],
    [
      "@babel/preset-react",
      {
        "runtime": "automatic",
      },
    ],
    [
      "@babel/preset-env",
      {
        "targets": config.jsrealm.targets,
        "bugfixes": true,
        "corejs": { "version": 3 },
        "useBuiltIns": "usage",
      },
    ],
  ],
  "plugins": [
    "@babel/plugin-transform-runtime",
    ["@babel/plugin-proposal-decorators", { "version": "2023-11" }],
  ],
};
