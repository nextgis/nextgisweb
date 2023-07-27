const fs = require("fs");
const glob = require("glob");
const path = require("path");

const { DefinePlugin } = require("webpack");
const WebpackAssetsManifest = require("webpack-assets-manifest");
const CopyPlugin = require("copy-webpack-plugin");

const config = require("./config.cjs");
const tagParser = require("./tag-parser.cjs");
const defaults = require("./webpack/defaults.cjs");
const { injectCode, stripIndex, virtualImport } = require("./webpack/util.cjs");
const iconUtil = require("./icon/util.cjs");

// Inject the following construction into each entrypoint module
// at compilation time:
//
//     import "@nextgisweb/jsrealm/with-chunks!entry-name";
//
// This import is handled by AMD loader and loads all chunks
// required by the entrypoint.
const withChunks = (ep) => `import "@nextgisweb/jsrealm/with-chunks!${ep}"`;

const logger = require("webpack/lib/logging/runtime").getLogger("jsrealm");

const babelOptions = require("./babelrc.cjs");
const presetEnvOptIndex = babelOptions.presets.findIndex(
    (item) => typeof item[0] === "string" && item[0] === "@babel/preset-env"
);

if (presetEnvOptIndex !== -1) {
    const presetEnvOpt = babelOptions.presets[presetEnvOptIndex];
    if (presetEnvOpt && typeof presetEnvOpt[1] === "object") {
        presetEnvOpt[1].targets = config.jsrealm.targets;
        babelOptions.presets[presetEnvOptIndex] = presetEnvOpt;
    }
}

function scanForEntries() {
    const result = [];
    for (const pkg of config.packages) {
        for (const candidate of glob.sync("**/*.{js,ts,tsx}", {
            cwd: pkg.path,
            ignore: ["node_modules/**", "contrib/**"],
        })) {
            const fn = pkg.path + "/" + candidate;
            const tag = tagParser(fn);
            if (tag) {
                tag.entry = pkg.name + "/" + stripIndex(candidate);
                tag.fullname = path.resolve(fn);
                result.push(tag);
            }
        }
    }
    return result;
}

let isDynamicEntry;

let plugins, testentries;

const dynamicEntries = () => {
    const entrypoints = scanForEntries();

    plugins = {};

    entrypoints
        .filter((ep) => ep.type === "plugin")
        .forEach(({ plugin, entry }) => {
            const [cat, id] = plugin.split(/\s+/, 2);
            if (plugins[cat] === undefined) plugins[cat] = {};
            plugins[cat][id] = entry;
        });

    testentries = Object.fromEntries(
        entrypoints
            .filter(({ type }) => type === "testentry")
            .map(({ entry, testentry: type }) => [entry, { type }])
    );

    const webpackEntries = Object.fromEntries(
        entrypoints.map(({ entry, fullname }) => [
            entry,
            {
                import: injectCode(fullname, withChunks(entry)),
                library: { type: "amd", name: entry },
            },
        ])
    );

    isDynamicEntry = (m) => webpackEntries[m] !== undefined;
    return webpackEntries;
};

const staticEntries = {};

function scanLocales(moduleName) {
    const result = {};
    const pat = path.join(require.resolve(moduleName), "..", "locale", "*.js");
    for (const filename of glob.sync(pat)) {
        const m = filename.match(/\/([a-z]{2}(?:[-_][a-z]{2})?)\.js$/i);
        if (m) {
            const original = m[1];
            const key = original.replace("_", "-").toLowerCase();
            result[key] = { key, original, filename };
        }
    }
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
    }

    test.push(lang);

    for (const c of test) {
        const m = map[c];
        if (m) return m;
    }

    if (key !== "en") return lookupLocale("en", map);

    throw "Locale 'en' not found!";
}

const antdLocales = scanLocales("antd");
const dayjsLocales = scanLocales("dayjs");

const localeOutDir = path.resolve(
    require.resolve("@nextgisweb/jsrealm/locale-loader"),
    "../locale"
);

for (const { code: lang, nplurals, plural } of config.i18n.languages) {
    const entry = `@nextgisweb/jsrealm/locale/${lang}`;
    const antd = lookupLocale(lang, antdLocales);
    const dayjs = lookupLocale(lang, dayjsLocales);

    const pofiles = [];
    Object.values(config.env.components).forEach((path) => {
        pofiles.push(...glob.sync(path + `/locale/${lang}.po`));
    });

    config.i18n.external &&
        pofiles.push(...glob.sync(config.i18n.external + `/*/*/${lang}.po`));

    const code = [
        withChunks(entry),
        `ngwConfig.plurals = [${nplurals}, n => Number(${plural})];`,
        `import antdLocale from "${antd.filename}";`,
        `export const antd = antdLocale.default;`,
        `import dayjs from "@nextgisweb/gui/dayjs";`,
        `import "${dayjs.filename}";`,
        `dayjs.locale('${dayjs.original}');`,
    ]
        .concat(pofiles.map((fn) => `import "${path.resolve(fn)}";`))
        .join("\n");

    staticEntries[entry] = {
        import: virtualImport(path.join(localeOutDir, lang + ".js"), code),
        library: { type: "amd", name: entry },
    };
}

const sharedIconIds = {};
const iconsFromJson = [];

for (const [comp, compDir] of Object.entries(config.env.components)) {
    const dir = path.resolve(compDir, "icon");
    if (!fs.existsSync(dir)) continue;

    for (let fn of glob.sync(`${dir}/**/*.svg`)) {
        const relSvgPath = path.relative(dir, fn).replace(/\.svg$/, "");
        const id = (`icon-${comp}-` + relSvgPath).replace(
            /\w+-resource\/(\w+)/,
            (m, p) => `rescls-${p}`
        );
        sharedIconIds[fn] = id;
    }

    for (const collection of Object.keys(iconUtil.COLLECTIONS)) {
        const fn = path.resolve(dir, `${collection}.json`);
        if (!fs.existsSync(fn)) continue;
        for (const ref of JSON.parse(fs.readFileSync(fn))) {
            iconsFromJson.push(`@nextgisweb/icon/${collection}/${ref}`);
        }
    }
}

const babelLoader = {
    loader: "babel-loader",
    options: babelOptions,
};

const webpackAssetsManifestPlugin = new WebpackAssetsManifest({
    entrypoints: true,
    output: "manifest.json",

    transform(assets) {
        const result = {};

        const processEntry = ([entry, data]) => [
            entry,
            (data.assets?.js || [])
                .filter((c) => c !== "chunk/runtime.js" && c !== `${entry}.js`)
                .map((c) => c.replace(/\.js$/, "")),
        ];

        result.dependencies = Object.fromEntries(
            Object.entries(assets.entrypoints)
                .map(processEntry)
                .filter((itm) => itm[1].length > 0)
        );

        return result;
    },

    done(manifest) {
        // Piggyback on the assets manifest hook to write testentry.json
        const fn = manifest.compiler.outputPath + "/testentry.json";
        fs.writeFileSync(fn, JSON.stringify(testentries));
    },
});

/** @type {import("webpack").Configuration} */
const webpackConfig = defaults("main", {
    entry: () => ({ ...staticEntries, ...dynamicEntries() }),
    module: {
        rules: [
            {
                test: require.resolve("@nextgisweb/jsrealm/shared-icon"),
                use: [
                    babelLoader,
                    {
                        loader: "imports-loader",
                        options: {
                            imports: Object.keys(sharedIconIds)
                                .concat(iconsFromJson)
                                .map((fn) => `side-effects ${fn}`),
                        },
                    },
                ],
            },
            {
                test: /\.(m?js|tsx?)$/,
                // In development mode exclude everything in node_modules for
                // better performance. In production mode exclude only specific
                // packages for better browser compatibility.
                exclude: config.debug
                    ? /node_modules/
                    : /node_modules\/(core-js|react|react-dom)/,
                resolve: { fullySpecified: false },
                use: babelLoader,
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.less$/i,
                use: ["style-loader", "css-loader", "less-loader"],
            },
            {
                test: /\.svg$/i,
                use: [
                    babelLoader,
                    {
                        loader: "svg-sprite-loader",
                        options: {
                            runtimeGenerator:
                                require.resolve("./icon/runtime.cjs"),
                            symbolId: (fn) => {
                                const shared = sharedIconIds[fn];
                                if (shared) return shared;
                                const imported = iconUtil.symbolId(fn);
                                if (imported) return imported;
                            },
                        },
                    },
                    "svgo-loader",
                ],
            },
            {
                test: /\.po$/,
                use: [babelLoader, require.resolve("./i18n/loader.cjs")],
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", "..."],
        plugins: [new iconUtil.IconResolverPlugin()],
    },
    plugins: [
        new DefinePlugin({
            JSREALM_PLUGIN_REGISTRY: DefinePlugin.runtimeValue(
                () => JSON.stringify(plugins),
                true
            ),
        }),
        new CopyPlugin({
            // Copy @nextgisweb/jsrealm/with-chunks!entry-name loader directly
            // to the dist directly. It is written in ES5-compatible way as AMD
            // module and mustn't be processed by webpack runtime loader.
            patterns: [
                {
                    from: require.resolve("./with-chunks.js"),
                    to: "@nextgisweb/jsrealm/",
                },
            ],
        }),
        webpackAssetsManifestPlugin,
    ],
    output: {
        enabledLibraryTypes: ["amd"],
        filename: (pathData) =>
            pathData.chunk.name !== undefined ? "[name].js" : "chunk/[name].js",
        chunkFilename: "chunk/[id].js",
    },
    externals: [
        function ({ context, request }, callback) {
            // Use AMD loader for with-chunks!some-entrypoint-name imports.
            if (request.startsWith("@nextgisweb/jsrealm/with-chunks!")) {
                return callback(null, `amd ${request}`);
            }

            // Use AMD loader for all entrypoints.
            const requestModule = request.replace(/!.*$/, "");
            if (isDynamicEntry(requestModule)) {
                if (["@nextgisweb/pyramid/i18n"].includes(requestModule)) {
                    const loader = /(!.*|)$/.exec(request)[1];
                    if (loader === "" || loader === "!") {
                        const re = /(?:\/nextgisweb_|\/)(\w+)\/nodepkg(?:$|\/)/;
                        const compId = re.exec(context)[1];
                        const newRequest = `${requestModule}!${compId}`;
                        logger.debug(
                            `"${request}" replaced with "${newRequest}"`
                        );
                        request = newRequest;
                    }
                }
                return callback(null, `amd ${request}`);
            }

            // External packages
            for (const external of config.externals) {
                if (request.startsWith(external + "/")) {
                    return callback(null, `amd ${request}`);
                }
            }

            // Legacy component AMD modules
            if (request.startsWith("ngw-")) {
                return callback(null, `amd ${request}`);
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
});

module.exports = webpackConfig;
