const path = require("path");
const fs = require("fs");

const env = process.env;
const configRoot = env.npm_package_config_nextgisweb_jsrealm_root;

function* packages() {
    const packageJson = JSON.parse(
        fs.readFileSync(`${configRoot}/package.json`)
    );
    for (const wsPath of packageJson.workspaces) {
        const packageJson = JSON.parse(
            fs.readFileSync(`${wsPath}/package.json`)
        );
        const packageName = packageJson.name;
        yield { name: packageName, path: wsPath, json: packageJson };
    }
}

module.exports = {
    debug: env.npm_package_config_nextgisweb_core_debug == "true",
    rootPath: path.resolve(configRoot),
    distPath: path.resolve(configRoot + "/dist"),
    externals: env.npm_package_config_nextgisweb_jsrealm_externals.split(","),
    targets: JSON.parse(env.npm_package_config_nextgisweb_jsrealm_targets),
    packages: packages,
};
