const config = require("@nextgisweb/jsrealm/config.cjs");

const path = require("path");
const fs = require("fs");
const os = require("os");
const glob = require("glob");
const doctrine = require("doctrine");

const WebpackAssetsManifest = require("webpack-assets-manifest");
const CopyPlugin = require("copy-webpack-plugin");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");

function scanForEntrypoints(pkg) {
    const result = [];
    for (const candidate of glob.sync("**/*.{js,ts}", {
        cwd: pkg.path,
        ignore: ["node_modules/**", "contrib/**"],
    })) {
        const content = fs.readFileSync(pkg.path + "/" + candidate, {
            encoding: "utf-8",
        });

        const jsdoc = /\/\*\*.*(?:\*\/$|$(?:\s*\*\s?.*$)*\s*\*\/)/m.exec(
            content
        );
        if (jsdoc !== null) {
            const payload = doctrine.parse(jsdoc[0], {
                unwrap: true,
                tags: ["entrypoint"],
            });
            for (const { title } of payload.tags) {
                if (title == "entrypoint") {
                    // console.log(`@entrypoint tag was found in "${pkg.name}/${candidate}"`);
                    result.push(candidate);
                    break;
                }
            }
        }
    }
    return result;
}

const entrypointList = {};
const entrypointRules = [];

for (const pkg of config.packages()) {
    const entrypoints =
        (pkg.json.nextgisweb || {}).entrypoints || scanForEntrypoints(pkg);
    for (const ep of entrypoints) {
        const epName =
            pkg.name + "/" + ep.replace(/(?:\/index)?\.(js|ts)$/, "");
        const fullname = require.resolve(pkg.name + "/" + ep);

        // Library name is required to get relative paths work.
        entrypointList[epName] = {
            import: fullname,
            library: { type: "amd", name: epName },
        };

        // This rule injects the following construction into each entrypoint
        // module at webpack compilation time:
        //
        //     import '@nextgisweb/jsrealm/with-chunks!some-entrypoint-name';
        //
        // The import is handled by AMD require loader and loads all chunks
        // required by the entrypoint.

        let addCode = `import '@nextgisweb/jsrealm/with-chunks!${epName}';`;
        if (config.debug) {
            // To debug the process of loading entrypoints uncomment the
            // following lines:
            // const m = `Webpack entrypoint '${epName}' is being executed...`
            // addCode += `\nconsole.debug("${m}");`;
        }
        entrypointRules.push({
            test: fullname,
            exclude: /node_modules/,
            use: {
                loader: "imports-loader",
                options: { additionalCode: addCode },
            },
        });
    }
}

function scanLocales(moduleName) {
    const result = {};
    const pat = path.join(require.resolve(moduleName), "..", "locale", "*.js");
    for (const filename of glob.sync(pat)) {
        const m = filename.match(/\/([a-z]{2}(?:[\-_][a-z]{2})?)\.js$/i);
        if (m) {
            const original = m[1];
            const key = original.replace('_', '-').toLowerCase();
            result[key] = {key, original, filename};
        };
    };
    return result;
}

const DEFAULT_COUNTRY_FOR_LANGUAGE = { en: "us", cs: "cz" };

function lookupLocale(key, map) {
    const m = key.match(/^(\w+)-(\w+)$/);
    const [lang, cnt] = m ? [m[1], m[2]] : [key, undefined];

    const test = [];

    if (cnt) {
        test.push(`${lang}-${cnt}`);
    } else {
        const cfl = DEFAULT_COUNTRY_FOR_LANGUAGE[lang];
        test.push(cfl ? `${lang}-${cfl}` : `${lang}-${lang}`);
    };

    test.push(lang);

    for (const c of test) {
        const m = map[c];
        if (m) { return m; }
    }

    if (key != 'en') {
        return lookupLocale('en', map);
    };

    throw "Locale 'en' not found!";
}

const antdLocales = scanLocales("antd");
const dayjsLocales = scanLocales("dayjs");

const localeOutDir = path.resolve(
    require.resolve("@nextgisweb/jsrealm/locale-loader"),
    "..", "locale");

for (const lang of config.locales) {
    const entrypoint = `@nextgisweb/jsrealm/locale/${lang}`;
    const antd = lookupLocale(lang, antdLocales);
    const dayjs = lookupLocale(lang, dayjsLocales);

    const code = (
        `import '@nextgisweb/jsrealm/with-chunks!${entrypoint}';\n` +
        `\n` +
        `import antdLocale from '${antd.filename}';\n` +
        `export const antd = antdLocale.default;\n` +
        `\n`+
        `import dayjs from '@nextgisweb/gui/dayjs';\n` +
        `\n` +
        `import '${dayjs.filename}';\n` +
        `dayjs.locale('${dayjs.original}');\n`
    );

    const jsFile = path.join(localeOutDir, lang + '.js');
    fs.writeFileSync(jsFile, code);
    entrypointList[entrypoint] = {
        import: jsFile,
        library: { type: "amd", name: entrypoint },
    };
}

module.exports = {
    mode: config.debug ? "development" : "production",
    devtool: config.debug ? "source-map" : false,
    entry: entrypointList,
    module: {
        rules: entrypointRules.concat([
            {
                test: /\.(m?js|ts?)$/,
                // In development mode exclude everything in node_modules for
                // better performance. In production mode exclude only specific
                // packages for better browser compatibility.
                exclude: config.debug ? /node_modules/ : [
                    /node_modules\/core-js/,
                    /node_modules\/react/,
                    /node_modules\/react-dom/,
                ],
                resolve: { fullySpecified: false },
                use: {
                    loader: "babel-loader",
                    options: {
                        sourceType: "unambiguous",
                        presets: [
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
                                    // debug: config.debug,
                                    corejs: { version: 3 },
                                    useBuiltIns: "usage",
                                    targets: config.targets,
                                },
                            ],
                        ],
                        plugins: ["@babel/plugin-transform-runtime"],
                    },
                },
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.less$/i,
                use: ["style-loader", "css-loader", "less-loader"],
            }
        ]),
    },
    plugins: [
        new WebpackAssetsManifest({ entrypoints: true }),
        new CopyPlugin({
            // Copy with-chunks!some-entrypoint-name loader directly to the dist
            // directly. It is written in ES5-compatible way as AMD module and
            // mustn't be processed by webpack runtime loader.
            patterns: [
                {
                    from: require.resolve("./with-chunks.js"),
                    to: "@nextgisweb/jsrealm/",
                },
            ],
        }),
        new CleanWebpackPlugin(),
        ...config.compressionPlugins,
        ...config.bundleAnalyzerPlugins,
    ],
    output: {
        path: path.resolve(config.rootPath, "dist/main"),
        filename: (pathData) =>
            pathData.chunk.name !== undefined ? "[name].js" : "chunk/[name].js",
        chunkFilename: "chunk/[id].js",
    },
    externals: [
        function ({ request }, callback) {
            // Use AMD loader for with-chunks!some-entrypoint-name imports.
            if (request.startsWith("@nextgisweb/jsrealm/with-chunks!")) {
                return callback(null, `amd ${request}`);
            }

            // Use AMD loader for all entrypoints.
            const requestModule = request.replace(/!.*$/, "");
            if (entrypointList[requestModule] !== undefined) {
                return callback(null, `amd ${request}`);
            }

            // Use AMD loader for extrenal dependecies.
            for (const ext of config.externals) {
                if (request.startsWith(ext + "/")) {
                    return callback(null, `amd ${request}`);
                }
            }
            callback();
        },
    ],
    optimization: {
        runtimeChunk: { name: "chunk/runtime" },
        splitChunks: {
            // Generate as many chunks as possible
            chunks: "all",
            minSize: 0,
        },
    },
    watchOptions: {
        poll: os.release().match(/-WSL.?$/) ? 1000 : false,
        ignored: "**/node_modules",
    },
};
