const fs = require("fs");
const path = require("path");

const CopyPlugin = require("copy-webpack-plugin");
const UglifyJS = require("uglify-js");
const UglifyCSS = require("uglifycss");

const { debug, env } = require("../jsrealm/config.cjs");
const defaults = require("../jsrealm/webpack/defaults.cjs");

function minify(content, path) {
    if (debug) return content;
    if (/\.(js)$/.test(path)) {
        const result = UglifyJS.minify(content.toString(), {
            compress: false,
        });
        return result.code;
    } else if (/\.(css)$/.test(path)) {
        const result = UglifyCSS.processString(content.toString());
        return result;
    }
    return content;
}

const patterns = Object.values(env.components)
    .map((p) => path.resolve(p, "amd"))
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ from: p, transform: minify }));

module.exports = defaults(
    "amd",
    {
        entry: {},
        plugins: [new CopyPlugin({ patterns })],
    },
    { bundleAnalyzer: false }
);
