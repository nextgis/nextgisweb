const fs = require("fs");
const path = require("path");

const packageJson = JSON.parse(fs.readFileSync(`package.json`), "utf8");
const section = packageJson.nextgisweb;

const components = [];
const packages = [];

for (const [cId, cPath] of Object.entries(section.env.components)) {
    components.push({ name: cId, path: path.resolve(cPath) });
}

for (const wsPath of packageJson.workspaces) {
    const packageJson = JSON.parse(
        fs.readFileSync(`${wsPath}/package.json`, "utf8")
    );
    const packageName = packageJson.name;
    packages.push({
        name: packageName,
        path: path.resolve(wsPath),
        json: packageJson,
    });
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

function pathToModule(path, strip = false) {
    for (const { name, path: cpath } of packages) {
        if (path.startsWith(cpath + "/") || path === cpath) {
            let result = name + path.slice(cpath.length);
            if (strip) result = result.replace(/(?:\/index)?\.[tj]?sx?$/, "");
            return result;
        }
    }
    return null;
}

module.exports = {
    debug,
    distPath,
    packages,
    pathToComponent,
    pathToModule,
    ...section,
};
