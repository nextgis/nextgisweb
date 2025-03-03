const fs = require("fs");
const path = require("path");

const config = require("../config");

function pkgPath(pkg, pth) {
    const base = require.resolve(pkg + "/package.json");
    return path.resolve(base, "..", pth);
}

const materialBase = pkgPath("@material-symbols/svg-500", "outlined");
const mdiBase = pkgPath("@mdi/svg", "svg");

const COLLECTIONS = {
    "material": (name) => {
        if (!/^[0-9a-z_]+(\/(outline|fill))?$/.test(name)) return undefined;
        name = name.replace(/\/fill$/, "-fill").replace(/\/outline$/, "");
        const target = path.join(materialBase, name + ".svg");
        if (fs.existsSync(target)) return target;
    },
    "mdi": (name) => {
        name = name.replace("_", "-");
        const target = path.join(mdiBase, name + ".svg");
        if (fs.existsSync(target)) return target;
    },
};

exports.COLLECTIONS = COLLECTIONS;

const iconFnToSymbolId = {};
exports.symbolId = (fn) => iconFnToSymbolId[fn];

exports.IconResolverPlugin = class IconResolverPlugin {
    apply(resolver) {
        const iconPkg = "@nextgisweb/icon/";
        const iconRegExp = /^@nextgisweb\/([a-z][a-z0-9-]*)\/icon\/(.*)$/;

        const hook = (request, resolveContext, callback) => {
            const req = request.request;

            if (req.startsWith(iconPkg)) {
                let [col, ...parts] = req.slice(iconPkg.length).split("/");
                const collection = COLLECTIONS[col];
                if (collection !== undefined) {
                    const name = parts.join("/");
                    const resolved = collection(name, request.context?.issuer);
                    if (resolved) {
                        let symbolId = `icon-${col}-${parts.join("-")}`;
                        symbolId = symbolId.replace(/-outline$/, "");
                        iconFnToSymbolId[resolved] = symbolId;
                        request.request = resolved;
                    }
                }
            } else {
                let match = iconRegExp.exec(req);
                if (match) {
                    let [comp, name] = match.slice(1);
                    comp = comp.replace("-", "_");
                    name = name.replace(/\.svg$/, "");
                    const compPath = path.resolve(config.env.components[comp]);
                    const target = path.join(compPath, "icon", `${name}.svg`);
                    const id = ["icon", comp, name.replace("/", "-")].join("-");
                    iconFnToSymbolId[target] = id;
                    request.request = target;
                }
            }

            callback();
        };

        resolver.getHook("resolve").tapAsync("IconResolverPlugin", hook);
    }
};
