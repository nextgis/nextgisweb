const config = require("@nextgisweb/jsrealm/config.cjs");

const path = require("path");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const UglifyJS = require("uglify-js");
const UglifyCSS = require("uglifycss");
const { debug } = require("../jsrealm/config.cjs");

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
        options.transform = content => content;
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

addPackage("cbtree", {
    globOptions: {
        ignore: [
            "**/cbtree/node_modules/**",
            "**/themes/(nihilo|soria|tundra|iphone)/**",
            "**/demos/**",
            "**/store/server/**",
        ],
    },
});

addPackage("handlebars", {
    from: "dist/handlebars.min.js",
    to: "handlebars.js",
});

addPackage("jed", {
    globOptions: {
        ignore: ["**/test/**"],
    },
});

addPackage("proj4", {
    from: "dist/proj4.js",
    transform: null,
});

addPackage("codemirror");

addPackage("jquery", {
    from: "dist/jquery.min.js",
    to: "jquery/jquery-3.2.1.min.js",
});

addPackage("@nextgisweb/external", {
    from: "contrib/jquery",
    to: "../../jquery",
});

module.exports = {
    mode: config.debug ? "development" : "production",
    devtool: false,
    entry: {},
    output: {
        path: path.resolve(config.distPath + "/external"),
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({ patterns: copyPatterns }),
        ...config.compressionPlugins,
    ],
};
