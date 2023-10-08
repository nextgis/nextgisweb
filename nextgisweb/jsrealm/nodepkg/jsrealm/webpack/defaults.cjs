const fs = require("fs");
const path = require("path");

const chalk = require("chalk");

const { debug, distPath } = require("../config.cjs");

const plugins = require("./plugins.cjs");

const defaults = {
    mode: debug ? "development" : "production",
    devtool: "source-map",
    stats: {
        assets: false,
        modules: false,
        moduleAssets: false,
        nestedModules: false,
    },
    watchOptions: {
        ignored: "**/node_modules",
    },
};

function isUpToDate(name) {
    const fn = path.resolve(distPath, name, "webpack-stats.json");
    if (!fs.existsSync(fn)) return false;

    const sdata = JSON.parse(fs.readFileSync(fn));
    if (sdata.errorsCount !== 0) return false;

    const lckct = fs.statSync(path.resolve("yarn.lock")).ctimeMs;
    const pkgct = fs.statSync(path.resolve("package.json")).ctimeMs;
    const bldct = fs.statSync(fn).ctimeMs;
    return lckct < bldct && pkgct < bldct;
}

function notice(message) {
    console.info(chalk.yellow("NOTICE:") + " " + message);
}

module.exports = (name, config, options) => {
    if (debug && options?.once && isUpToDate(name)) {
        notice(`${name} build is up-to-date, skipping!`);
        return [];
    }

    return (env) => {
        if (typeof config === "function") config = config(env);

        for (const [k, v] of Object.entries(defaults)) {
            if (config[k] === undefined) config[k] = v;
        }

        if (config.name === undefined) config.name = name;
        if (config.bail === undefined) config.bail = !env.WEBPACK_WATCH;

        if (config.output === undefined) config.output = {};
        if (config.output.path === undefined) {
            config.output.path = path.resolve(distPath, name);
        }

        if (config.plugins === undefined) config.plugins = [];
        config.plugins.push(...plugins(options));

        if (config.performance === undefined) config.performance = {};
        if (config.performance.hints === undefined) {
            config.performance.hints = false;
        }

        return config;
    };
};
