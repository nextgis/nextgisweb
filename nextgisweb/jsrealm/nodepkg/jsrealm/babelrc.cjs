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
                "corejs": { "version": 3 },
                "useBuiltIns": "usage",
                // The "targets" key doesn't work with "@babel/eslint-parser".
                // So it's defined in webpack config.
            },
        ],
    ],
    "plugins": ["@babel/plugin-transform-runtime"],
};
