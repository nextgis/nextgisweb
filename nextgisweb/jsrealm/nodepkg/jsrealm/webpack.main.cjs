const fs = require("fs");
const glob = require("glob");
const path = require("path");

const ESLintPlugin = require("eslint-webpack-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const { sortBy } = require("lodash");
const { DefinePlugin } = require("webpack");

const babelOptions = require("./babelrc.cjs");
const config = require("./config.cjs");
const iconUtil = require("./icon/util.cjs");
const tagParser = require("./tag-parser.cjs");
const defaults = require("./webpack/defaults.cjs");
const fontWeightFix = require("./webpack/font-weight-fix.cjs");
const { stripIndex } = require("./webpack/util.cjs");

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

const entrypoints = scanForEntries();
const plRegistries = {};
const plFileToRegistry = {};

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
            const body = fs.readFileSync(fullname, "utf8");
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
            `/* eslint-disable prettier/prettier */`,
            `/* eslint-disable import-x/order */`,
            `/* eslint-disable import-x/namespace */`,
            `/* eslint-disable @typescript-eslint/no-unused-expressions */`,
            ``,
            `import { registry } from "${entry}";`,
            ...plugins.map((f, i) => `import * as p${i + 1} from "${f}";`),
            ``,
            `export * from "${entry}";`,
        ];

        if (registry === "@nextgisweb/jsrealm/entrypoint/registry") {
            code.push(``, `// JSRealm entries`);
            config.jsrealm.entries.forEach(([component, module]) => {
                code.push(
                    ``,
                    `registry.register("${component}", {`,
                    `    identity: "${module}",`,
                    `    value: () => import("${module}"),`,
                    `});`
                );
            });

            // Register entrypoint marked with "@entrypoint" in the entrypoint
            // registry. Eventually, we'll eliminate "@entrypoint" marker at
            // all, and this block will be deleted.

            code.push(``, `// Legacy @entrypoints`);
            entrypoints
                .filter(({ type }) => type === "entrypoint")
                .forEach(({ entry, fullname }) => {
                    const component = config.pathToComponent(fullname);
                    code.push(
                        ``,
                        `registry.register("${component}", {`,
                        `    identity: "${entry}",`,
                        `    value: () => import("${entry}"),`,
                        `});`
                    );
                });

            code.push(``, `// Other`, ``);
        } else if (registry === "@nextgisweb/jsrealm/plugin/meta") {
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
            fs.readFileSync(registryObject.loaderFile, "utf8") !== codeString
        ) {
            fs.writeFileSync(registryObject.loaderFile, codeString);
        }
    });

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

    if (config.i18n.external) {
        pofiles.push(...glob.sync(config.i18n.external + `/*/*/${lang}.po`));
    }

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
const iconsCollection = [];
const iconTypeDefs = [];

for (const [comp, compDir] of Object.entries(config.env.components)) {
    const iconDir = path.resolve(compDir, "icon");
    if (!fs.existsSync(iconDir)) continue;

    const mod = ["@nextgisweb", comp.replace("_", "-"), "icon", "*"].join("/");
    const resourceDir = path.join(iconDir, "resource");
    for (const fn of glob.sync(`**/*.svg`, {
        cwd: iconDir,
        absolute: true,
    })) {
        if (fn.startsWith(resourceDir)) {
            const id = fn.replace(
                /.*\/(\w+)\.svg$/,
                (m, n) => `icon-rescls-${n}`
            );
            sharedIconIds[fn] = id;
        } else if (!iconTypeDefs.includes(mod)) {
            iconTypeDefs.push(mod);
        }
    }
}

for (const [collection, ...rest] of config.jsrealm.icons) {
    const suf = rest.filter((i) => !!i);
    if (collection in iconUtil.COLLECTIONS) {
        iconsCollection.push(`@nextgisweb/icon/${collection}/${suf}`);
    } else {
        const compDir = path.resolve(config.env.components[collection]);
        const fn = path.join(compDir, "icon", ...suf) + ".svg";
        const id = `icon-${collection}-${suf.join("-")}`;
        sharedIconIds[fn] = id;
    }
}

fs.writeFileSync(
    path.join(__dirname, "icon.inc.ts"),
    Object.keys(sharedIconIds)
        .concat(iconsCollection)
        .map((i) => `import "${i}";`)
        .join("\n") + "\n"
);

fs.writeFileSync(
    path.join(__dirname, "../icon/comp.inc.d.ts"),
    iconTypeDefs
        .map((m) => {
            return [
                `declare module "${m}" {`,
                `    import type { IconComponent } from "@nextgisweb/icon";\n`,
                `    const value: IconComponent;`,
                `    export = value;`,
                `}\n`,
            ].join("\n");
        })
        .join("\n")
);

const babelLoader = {
    loader: "babel-loader",
    options: babelOptions,
};

/** @type {import("webpack").Configuration} */
const webpackConfig = defaults("main", (env) => ({
    entry: { "ngwEntry": require.resolve("@nextgisweb/jsrealm/ngwEntry.js") },
    module: {
        rules: [
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
                      configType: "flat",
                      failOnError: false,
                      failOnWarning: false,
                  }),
              ]
            : []),
    ],

    optimization: {
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
