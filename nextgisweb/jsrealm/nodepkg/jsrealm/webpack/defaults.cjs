const os = require("os");
const path = require("path");
const { debug, distPath } = require("../config.cjs");
const plugins = require("./plugins.cjs");

const defaults = {
    mode: debug ? "development" : "production",
    devtool: debug ? "source-map" : undefined,
    watchOptions: {
        poll: os.release().match(/-WSL.?$/) ? 1000 : false,
        ignored: "**/node_modules",
    },
};

module.exports = (name, config, options) => {
    return (env) => {
        if (typeof config === "function") config = config(env);

        for (const [k, v] of Object.entries(defaults)) {
            if (config[k] === undefined) config[k] = v;
        }

        if (config.bail === undefined) config.bail = !env.WEBPACK_WATCH;

        if (config.output === undefined) config.output = {};
        if (config.output.path === undefined) {
            config.output.path = path.resolve(distPath, name);
        }

        if (config.plugins === undefined) config.plugins = [];
        config.plugins.push(...plugins(options));

        return config;
    };
};
