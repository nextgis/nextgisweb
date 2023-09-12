const fs = require("fs");
const path = require("path");

const packageJson = JSON.parse(fs.readFileSync(`package.json`));
const section = packageJson.nextgisweb;

const components = [];
const packages = [];
const externals = [];

for (const [cId, cPath] of Object.entries(section.env.components)) {
    components.push({ name: cId, path: path.resolve(cPath) });
}

for (const wsPath of packageJson.workspaces) {
    const packageJson = JSON.parse(fs.readFileSync(`${wsPath}/package.json`));
    const packageName = packageJson.name;
    packages.push({
        name: packageName,
        path: path.resolve(wsPath),
        json: packageJson,
    });
    externals.push(...(packageJson?.nextgisweb?.externals || []));
}

const debug = section.core.debug;
const distPath = path.resolve("dist");

function pathToComponent(path) {
    for (const { name, path: cpath } of components) {
        if (path.startsWith(cpath + "/") || path === cpath) {
            return name;
        }
    }
    return null;
}

function pathToModule(path) {
    for (const { name, path: cpath } of packages) {
        if (path.startsWith(cpath + "/") || path === cpath) {
            return name + path.slice(cpath.length);
        }
    }
    return null;
}

module.exports = {
    debug,
    distPath,
    packages,
    externals,
    pathToComponent,
    pathToModule,
    ...section,
};
