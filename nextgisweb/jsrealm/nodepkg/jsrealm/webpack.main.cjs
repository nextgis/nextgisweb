const fs = require("fs");
const glob = require("glob");
const path = require("path");

const ESLintPlugin = require("eslint-webpack-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const { sortBy } = require("lodash");
const { DefinePlugin } = require("webpack");
const WebpackAssetsManifest = require("webpack-assets-manifest");

const babelOptions = require("./babelrc.cjs");
const config = require("./config.cjs");
const iconUtil = require("./icon/util.cjs");
const tagParser = require("./tag-parser.cjs");
const defaults = require("./webpack/defaults.cjs");
const fontWeightFix = require("./webpack/font-weight-fix.cjs");
const { injectCode, stripIndex } = require("./webpack/util.cjs");

// Inject the following construction into each entrypoint module
// at compilation time:
//
//     import "@nextgisweb/jsrealm/with-chunks!entry-name";
//
// This import is handled by AMD loader and loads all chunks
// required by the entrypoint.
const WITH_CHUNKS = "@nextgisweb/jsrealm/with-chunks";
const withChunks = (ep) => `import "${WITH_CHUNKS}!${ep}"`;

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

let isDynamicEntry, plRegistries, plFileToRegistry;

const dynamicEntries = () => {
    const entrypoints = scanForEntries();

    plRegistries = {};
    plFileToRegistry = {};

    entrypoints
        .filter(({ type }) => type === "registry")
        .forEach(({ entry, fullname }) => {
            const loaderFile = fullname.replace(/\.[tj]?sx?$/, ".inc.ts");
            const loaderModule = fullname.replace(/(\.[tj]?sx?)?$/, ".inc");
            plFileToRegistry[fullname] = plRegistries[entry] = {
                component: config.pathToComponent(fullname),
                fullname,
                loaderFile,
                loaderModule,
                pluginFiles: [],
                pluginModules: [],
            };
        });

    const plRegExp = /\s+from\s+["](@nextgisweb\/[^"]*)["];/g;
    entrypoints
        .filter(({ type }) => type === "plugin")
        .forEach(({ entry, plugin: registry, fullname }) => {
            if (!registry) {
                const body = fs.readFileSync(fullname, { encoding: "utf-8" });
                for (const [_, n] of body.matchAll(plRegExp)) {
                    if (plRegistries[n] !== undefined) {
                        registry = n;
                        break;
                    }
                }
            }

            const registryObject = plRegistries[registry];
            if (registryObject) {
                registryObject.pluginFiles.push(fullname);
                registryObject.pluginModules.push(entry);
            } else {
                console.log(`Registry missing for ${entry}`);
            }
        });

    entrypoints
        .filter(({ type }) => type === "registry")
        .forEach(({ entry, fullname, registry }) => {
            registry = registry || config.pathToModule(fullname, true);

            const registryObject = plRegistries[registry];
            const plugins = registryObject.pluginModules;

            const code = [
                `/* eslint-disable @typescript-eslint/no-explicit-any */`,
                `/* eslint-disable prettier/prettier */`,
                `/* eslint-disable import/order */`,
                ``,
                `import { registry } from "${entry}";`,
                ...plugins.map((f, i) => `import * as p${i + 1} from "${f}";`),
                ``,
                `export * from "${entry}";`,
            ];

            if (registry === "@nextgisweb/jsrealm/plugin/meta") {
                for (const [entry, itm] of Object.entries(plRegistries)) {
                    // Do not include meta registry itself
                    if (entry === registry) continue;
                    code.push(
                        ``,
                        `registry.registerLoader(`,
                        `    "${itm.component}",`,
                        `    () => import("${entry}").then(({ registry }) => registry as any),`,
                        `    { identity: "${entry}" }`,
                        `);`
                    );
                }
            } else if (registry === "@nextgisweb/jsrealm/testentry/registry") {
                const testentries = sortBy(
                    entrypoints
                        .filter(({ type }) => type === "testentry")
                        .map(({ entry, testentry, fullname }) => ({
                            component: config.pathToComponent(fullname),
                            driver: testentry,
                            entry: entry,
                        })),
                    ["entry"]
                );

                for (const { component, driver, entry } of testentries) {
                    code.push(
                        ``,
                        `registry.register("${component}", {`,
                        `    identity: "${entry}",`,
                        `    driver: "${driver}",`,
                        `    value: () => import("${entry}")`,
                        `});`
                    );
                }
            }

            code.push("", "registry.seal();");

            if (plugins.length > 0) {
                // Side-effect to prevent tree shaking
                const px = plugins.map((_, i) => `p${i + 1}`);
                code.push("", `[${px.join(", ")}];`);
            }

            const codeString = code.join("\n") + "\n";
            if (
                !fs.existsSync(registryObject.loaderFile) ||
                fs.readFileSync(registryObject.loaderFile, {
                    encoding: "utf-8",
                }) !== codeString
            ) {
                fs.writeFileSync(registryObject.loaderFile, codeString);
            }
        });

    const webpackEntries = Object.fromEntries(
        entrypoints
            .filter(({ type }) => type === "entrypoint")
            .map(({ entry, fullname }) => {
                if (entry !== WITH_CHUNKS) {
                    fullname = injectCode(fullname, withChunks(entry));
                }
                return [
                    entry,
                    {
                        import: fullname,
                        library: { type: "amd", name: entry },
                    },
                ];
            })
    );

    isDynamicEntry = (m) => webpackEntries[m] !== undefined;
    return webpackEntries;
};

const registryResolver = {
    apply(resolver) {
        resolver.hooks.result.tap("registryResolver", (result) => {
            const registryObject = plFileToRegistry[result.path];
            if (registryObject) {
                const issuer = result.context.issuer;
                if (
                    issuer === registryObject.loaderFile ||
                    registryObject.pluginFiles.includes(issuer)
                ) {
                    return result;
                } else {
                    result.path = registryObject.loaderFile;
                    return result;
                }
            }
        });

        // Redirect @nexgisweb/pyramid/i18n with component specific
        // @nextgisweb/jsrealm/i18n/comp/* implementations.
        resolver.getHook("beforeResolve").tap("PyramidI18nHook", (obj) => {
            if (!obj.context.issuer) return;

            let match = false;
            if (obj.request === "@nextgisweb/pyramid/i18n") {
                match = true;
            } else if (
                obj.request.startsWith(".") &&
                obj.request.endsWith("/i18n")
            ) {
                const joined = path.join(obj.path, obj.request);
                match = joined.endsWith("/nextgisweb/pyramid/nodepkg/i18n");
            }
            if (match) {
                const comp = config.pathToComponent(obj.path);
                if (comp) {
                    obj.request = `@nextgisweb/jsrealm/i18n/comp/${comp}.inc`;
                }
            }
        });
    },
};

const NGW_ENTRY = "@nextgisweb/jsrealm/ngwEntry";
const staticEntries = { [NGW_ENTRY]: require.resolve(`${NGW_ENTRY}.js`) };

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

const jsrealmPackageJson = require.resolve("@nextgisweb/jsrealm/package.json");
const i18nCompDir = path.resolve(jsrealmPackageJson, "../i18n/comp");
const i18nLangDir = path.resolve(jsrealmPackageJson, "../i18n/lang");

const gettextReexport = [];
for (const p of ["", "n", "p", "np"]) {
    for (const s of ["", "f"]) {
        gettextReexport.push(`${p}gettext${s}`);
    }
}

for (const comp of Object.keys(config.env.components)) {
    const code = [
        'import { domain as domainFactory } from "@nextgisweb/pyramid/i18n/gettext";\n',
        `const domain = domainFactory("${comp}");\n`,
        "export const {",
        ...gettextReexport.map((i) => `    ${i},`),
        "} = domain;\n",
        "export default domain;",
    ];
    const fn = path.join(i18nCompDir, `${comp}.inc.ts`);
    fs.writeFileSync(fn, code.join("\n") + "\n");
}

for (const { code: lang, nplurals, plural } of config.i18n.languages) {
    const antd = lookupLocale(lang, antdLocales);
    const dayjs = lookupLocale(lang, dayjsLocales);

    const pofiles = [];
    Object.values(config.env.components).forEach((path) => {
        pofiles.push(...glob.sync(path + `/locale/${lang}.po`));
    });

    config.i18n.external &&
        pofiles.push(...glob.sync(config.i18n.external + `/*/*/${lang}.po`));

    const code = [
        "/* eslint-disable eqeqeq */",
        "/* eslint-disable @typescript-eslint/no-unused-vars */",
        "/* eslint-disable prettier/prettier */",
        `import { default as antd } from "${antd.filename}";`,
        `import dayjs from "@nextgisweb/gui/dayjs";`,
        `import "${dayjs.filename}";\n`,
        ...pofiles.map((fn) => `import "${path.resolve(fn)}";`),
        "",
        `dayjs.locale("${dayjs.original}");`,
        `ngwConfig.plurals = [${nplurals}, (n) => Number(${plural})];`,
        "export { antd }",
    ];
    const fn = path.join(i18nLangDir, `${lang}.inc.ts`);
    fs.writeFileSync(fn, code.join("\n") + "\n");
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
                .filter((c) => c !== "runtime.js" && c !== `${entry}.js`)
                .map((c) => c.replace(/\.js$/, "")),
        ];

        result.dependencies = Object.fromEntries(
            Object.entries(assets.entrypoints)
                .map(processEntry)
                .filter((itm) => itm[1].length > 0)
        );

        return result;
    },
});

/* Does the path belongs to NGW component with JS package? */ /* prettier-ignore */
const ngwCompRegExp = new RegExp("/(?:nextgisweb(?:_\\w+)?/)(\\w+)/nodepkg(?:$|/)");

/* Does the module name belongs to an external or legacy AMD? */ /* prettier-ignore */
const extOrLegacyRegExp = new RegExp(`^(((${config.externals.join("|")})(/|$)))`);

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
                use: ["style-loader", "css-loader", fontWeightFix],
            },
            {
                test: /\.less$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    fontWeightFix,
                    "less-loader",
                ],
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
        plugins: [registryResolver, new iconUtil.IconResolverPlugin()],
    },
    plugins: [
        new DefinePlugin({
            COMP_ID: DefinePlugin.runtimeValue(({ module }) => {
                return JSON.stringify(config.pathToComponent(module.context));
            }),
            MODULE_NAME: DefinePlugin.runtimeValue(({ module }) => {
                const result = config.pathToModule(module.resource, true);
                return JSON.stringify(result);
            }),
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
        filename: () => "[name].js",
        chunkFilename: "[id].js",
    },
    externals: [
        function ({ context, request }, callback) {
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
                    const mod = rmod + (rarg !== undefined ? "!" + rarg : "");
                    return callback(null, `amd ${mod}`);
                }
            }

            callback();
        },
    ],
    optimization: {
        runtimeChunk: { name: "runtime" },
        splitChunks: {
            // Generate as many chunks as possible
            chunks: "all",
            minSize: 0,
        },
        minimizer: [
            {
                apply: (compiler) => {
                    const TerserPlugin = require("terser-webpack-plugin");
                    new TerserPlugin({
                        terserOptions: {
                            // Webpack default options
                            compress: { passes: 2 },
                            // Keep class names for exceptions and Sentry
                            keep_classnames: true,
                        },
                    }).apply(compiler);
                },
            },
        ],
    },
}));

module.exports = webpackConfig;
