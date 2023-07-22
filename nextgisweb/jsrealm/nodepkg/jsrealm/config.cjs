const fs = require("fs");
const path = require("path");

const packageJson = JSON.parse(fs.readFileSync(`package.json`));
const section = packageJson.nextgisweb;

const packages = [];
const externals = [];

for (const wsPath of packageJson.workspaces) {
    const packageJson = JSON.parse(fs.readFileSync(`${wsPath}/package.json`));
    const packageName = packageJson.name;
    packages.push({ name: packageName, path: wsPath, json: packageJson });
    externals.push(...(packageJson?.nextgisweb?.externals || []));
}

const debug = section.core.debug;
const distPath = path.resolve("dist");

module.exports = {
    debug,
    distPath,
    packages,
    externals,
    ...section,
};
