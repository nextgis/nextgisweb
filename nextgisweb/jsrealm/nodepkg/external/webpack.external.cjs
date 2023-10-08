const path = require("path");

const CopyPlugin = require("copy-webpack-plugin");
const UglifyJS = require("uglify-js");
const UglifyCSS = require("uglifycss");

const { debug } = require("../jsrealm/config.cjs");
const defaults = require("../jsrealm/webpack/defaults.cjs");

function minify(content, path) {
    if (debug) return content;
    if (/\.min\./.test(path)) {
        // Do nothing with already minified files!
    } else if (/\.(js)$/.test(path)) {
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

const copyPatterns = [];

function addPackage(name, options) {
    const root = path.resolve(`./node_modules/${name}`);

    options = options || {};
    options.context = root + (options.context ? `/${options.context}` : "");
    options.from = options.from || "./";
    options.to = name + (options.to ? `/${options.to}` : "");
    options.info = options.info || { minimized: true };

    if (options.transform === null) {
        options.transform = (content) => content;
    }
    options.transform =
        options.transform !== undefined ? options.transform : minify;

    copyPatterns.push(options);
}

for (const pkg of ["dojo", "dijit", "dojox"]) {
    addPackage(pkg, {
        globOptions: {
            ignore: [
                "**/tests/**",
                "**/testsDOH/**",
                "**/demos/**",
                "**/dojox/mobile/**",
                "**/themes/(nihilo|soria|tundra|iphone)/**",
            ],
        },
    });
}

addPackage("xstyle", {
    globOptions: {
        ignore: ["**/test/**"],
    },
});

addPackage("put-selector", {
    from: "put.js",
});

addPackage("dgrid", {
    globOptions: {
        ignore: ["**/test/**", "**/demos/**", "**/doc/**"],
    },
});

addPackage("handlebars", {
    from: "dist/handlebars.min.js",
    to: "handlebars.js",
});

addPackage("mocha", {
    from: "mocha.*",
});

module.exports = defaults(
    "external",
    {
        entry: {},
        plugins: [new CopyPlugin({ patterns: copyPatterns })],
    },
    { once: true, bundleAnalyzer: false }
);
