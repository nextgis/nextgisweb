const fs = require("fs");
const glob = require("glob");
const path = require("path");

const CopyPlugin = require("copy-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const WebpackAssetsManifest = require("webpack-assets-manifest");

const babelOptions = require("./babelrc.cjs");
const config = require("./config.cjs");
const iconUtil = require("./icon/util.cjs");
const tagParser = require("./tag-parser.cjs");
const defaults = require("./webpack/defaults.cjs");
const { injectCode, stripIndex, virtualImport } = require("./webpack/util.cjs");

// Inject the following construction into each entrypoint module
// at compilation time:
//
//     import "@nextgisweb/jsrealm/with-chunks!entry-name";
//
// This import is handled by AMD loader and loads all chunks
// required by the entrypoint.
const withChunks = (ep) => `import "@nextgisweb/jsrealm/with-chunks!${ep}"`;

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
let testentries, plRegistries, plFileScope;

const dynamicEntries = () => {
    const entrypoints = scanForEntries();

    testentries = Object.fromEntries(
        entrypoints
            .filter(({ type }) => type === "testentry")
            .map(({ entry, testentry: type }) => [entry, { type }])
    );

    plRegistries = [];
    plFileScope = {};

    const plScopeFiles = {};

    entrypoints
        .filter(({ type }) => type === "plugin")
        .forEach(({ plugin, fullname }) => {
            if (plScopeFiles[plugin] === undefined) plScopeFiles[plugin] = [];
            plFileScope[fullname] = plugin;
            plScopeFiles[plugin].push(fullname);
        });

    entrypoints
        .filter(({ type }) => type === "registry")
        .forEach(({ entry, fullname, registry }) => {
            plRegistries.push({
                scope: registry,
                fullname,
                entry,
                component: config.pathToComponent(fullname),
            });
        });

    const webpackEntries = Object.fromEntries(
        entrypoints
            .filter(({ type }) => type !== "plugin")
            .map(({ type, entry, fullname, registry }) => {
                if (type === "registry") {
                    const wrapper = fullname.replace(
                        /\.[tj]?sx?$/,
                        "-wrapper.js"
                    );

                    const code = [
                        withChunks(entry),
                        `import entrypoint from "@nextgisweb/jsrealm/entrypoint";`,
                        `import { registry } from "${fullname}";`,
                        ...(plScopeFiles[registry] || []).map(
                            // Import + side-effect to avoid shaking out
                            (fn, i) => `import * as m${i} from "${fn}"; m${i};`
                        ),
                    ];

                    if (registry === "jsrealm/plugin/meta") {
                        for (const itm of plRegistries) {
                            // Do not include meta registry itself
                            if (itm.scope === "jsrealm/plugin/meta") continue;
                            code.push(
                                `registry.register({`,
                                `    component: "${itm.component}", `,
                                `    identity: "${itm.scope}",`,
                                `    import: () => entrypoint("${itm.entry}").then(({ registry }) => ({ default: registry }))`,
                                `});`
                            );
                        }
                    }

                    code.push(
                        `export * from "${fullname}";`,
                        `if (!registry) throw new Error("Registry '${registry}' is not defined");`,
                        "registry.seal();"
                    );

                    return [
                        entry,
                        {
                            import: virtualImport(wrapper, code.join("\n")),
                            library: { type: "amd", name: entry },
                        },
                    ];
                } else {
                    return [
                        entry,
                        {
                            import: injectCode(fullname, withChunks(entry)),
                            library: { type: "amd", name: entry },
                        },
                    ];
                }
            })
    );

    isDynamicEntry = (m) => webpackEntries[m] !== undefined;
    return webpackEntries;
};

const staticEntries = {};

function scanLocales(pkg, subpath = "") {
    const root = require.resolve(pkg + "/package.json");
    const pattern = path.resolve(root, "..", subpath, "locale/*.js");
    const result = {};
    for (const filename of glob.sync(pattern)) {
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

const antdLocales = scanLocales("antd", "es");
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
        `export { default as antd } from "${antd.filename}";`,
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

/* Does the path belongs to NGW component with JS package? */ /* prettier-ignore */
const ngwCompRegExp = new RegExp("/(?:nextgisweb(?:_\\w+)?/)(\\w+)/nodepkg(?:$|/)");

/* Does the module name belongs to an external or legacy AMD? */ /* prettier-ignore */
const extOrLegacyRegExp = new RegExp(`^(((${config.externals.join("|")})(/|$))|ngw-)`);

/** @type {import("webpack").Configuration} */
const webpackConfig = defaults("main", (env) => ({
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
        ...(config.jsrealm.tscheck || env.tscheck
            ? [new ForkTsCheckerPlugin()]
            : []),
        ...(config.jsrealm.eslint || env.eslint
            ? [
                  new ESLintPlugin({
                      quiet: true,
                      extensions: ["js", "ts", "tsx"],
                  }),
              ]
            : []),
        webpackAssetsManifestPlugin,
    ],
    output: {
        enabledLibraryTypes: ["amd"],
        filename: (pathData) =>
            pathData.chunk.name !== undefined ? "[name].js" : "chunk/[name].js",
        chunkFilename: "chunk/[id].js",
    },
    externals: [
        function ({ context, request, contextInfo }, callback) {
            // Use AMD loader for with-chunks!some-entrypoint-name imports.
            if (request.startsWith("@nextgisweb/jsrealm/with-chunks!")) {
                return callback(null, `amd ${request}`);
            }

            if (extOrLegacyRegExp.test(request)) {
                return callback(null, `amd ${request}`);
            }

            const swith = (w) => request.startsWith(w);
            const rtype = swith(".") ? "rel" : swith("/") ? "abs" : null;

            let rpkg = null;
            if (swith("@nextgisweb/")) {
                rpkg = request;
            } else if (
                ngwCompRegExp.test(context) &&
                !/^[a-z][0-9a-z-_]*:/i.test(context) &&
                rtype
            ) {
                if (rtype === "rel") {
                    const contextPkg = config.pathToModule(context);
                    rpkg = path.join(contextPkg, request);
                    if (rpkg.startsWith(".")) rpkg = null;
                } else if (rtype === "abs") {
                    rpkg = config.pathToModule(request);
                }
            }

            if (rpkg) {
                let [rmod, rarg] = rpkg.split("!", 2);
                if (isDynamicEntry(rmod)) {
                    if (rmod === "@nextgisweb/pyramid/i18n" && !rarg) {
                        rarg = config.pathToComponent(context);
                    }

                    // If it's a plugin for some registry, we must import an
                    // unwrapped registry module. Plugins must import registries
                    // from modules with @registry.
                    const iscope = plFileScope[contextInfo.issuer];
                    if (iscope) {
                        for (const { scope, entry } of plRegistries) {
                            if (iscope === scope && rmod === entry) {
                                return callback();
                            }
                        }
                    }

                    const mod = rmod + (rarg !== undefined ? "!" + rarg : "");
                    return callback(null, `amd ${mod}`);
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
}));

module.exports = webpackConfig;
