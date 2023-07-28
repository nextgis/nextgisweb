const config = require("@nextgisweb/jsrealm/config.cjs");

const modules = [];
for (const pkg of config.packages) {
    const webpackConfigs = (pkg.json.nextgisweb || {}).webpackConfigs || {};
    for (const modFile of Object.values(webpackConfigs)) {
        const m = require(pkg.name + "/" + modFile);
        if (Array.isArray(m) && m.length === 0) continue;
        modules.push(m);
    }
}

module.exports = modules;
