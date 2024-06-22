/* eslint-disable no-use-before-define */
const fs = require("fs");
const path = require("path");

const PKG_ICON = "@nextgisweb/icon/";
const COLLECTIONS = {
    "material": (name) => {
        name = name.replace("-", "_");

        // First we check legacy Material Icons
        let iconsName = name;
        if (!name.includes("/")) iconsName = iconsName + "/baseline";
        const iconsFn = path.join(materialIconsBase, iconsName + ".svg");
        if (fs.existsSync(iconsFn)) return iconsFn;

        // Then moderm Material Symbols
        const symbolsName = name.replace(/\/fill$/, "-fill");
        const symbolsFn = path.join(materialSymbolsBase, symbolsName + ".svg");
        if (fs.existsSync(symbolsFn)) return symbolsFn;
    },
    "mdi": (name) => {
        name = name.replace("_", "-");
        const target = path.join(mdiBase, name + ".svg");
        if (fs.existsSync(target)) return target;
    },
};

function pkgPath(pkg, pth) {
    const base = require.resolve(pkg + "/package.json");
    return path.resolve(base, "..", pth);
}

const materialSymbolsBase = pkgPath("@material-symbols/svg-500", "outlined");
const materialIconsBase = pkgPath("@material-icons/svg", "svg");
const mdiBase = pkgPath("@mdi/svg", "svg");

exports.COLLECTIONS = COLLECTIONS;

exports.IconResolverPlugin = class IconResolverPlugin {
    apply(resolver) {
        const hook = (request, resolveContext, callback) => {
            let req = request.request;
            if (req.startsWith(PKG_ICON)) {
                let [col, ...parts] = req.slice(PKG_ICON.length).split("/");
                const collection = COLLECTIONS[col];
                if (collection !== undefined) {
                    const name = parts.join("/");
                    const resolved = collection(name);
                    if (resolved) {
                        const symbolId = `icon-${col}-${parts.join("-")}`;
                        iconFnToSymbolId[resolved] = symbolId;
                        request.request = resolved;
                    } else {
                        console.warn(`Unable to resolve icon: ${req}`);
                    }
                }
            }

            callback();
        };

        resolver.getHook("resolve").tapAsync("IconResolverPlugin", hook);
    }
};

const iconFnToSymbolId = {};
exports.symbolId = (fn) => iconFnToSymbolId[fn];
