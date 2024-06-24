/* eslint-disable no-use-before-define */
const fs = require("fs");
const glob = require("glob");
const path = require("path");

const PKG_ICON = "@nextgisweb/icon/";
const COLLECTIONS = {
    "material": (name, ctx) => {
        if (!/^[0-9a-z_]+(\/(outline|fill))?$/.test(name)) return undefined;

        // Material Icons
        let iconsName = name.replace(/\/fill$/, "/baseline");
        if (!iconsName.includes("/")) iconsName = iconsName + "/outline";
        iconsName = materialIconsRemap[iconsName] ?? iconsName;
        let iconsFn = path.join(materialIconsBase, iconsName + ".svg");
        if (!fs.existsSync(iconsFn)) iconsFn = undefined;

        // Material Symbols
        const symbolsName = name
            .replace(/\/fill$/, "-fill")
            .replace(/\/outline$/, "");
        let symbolsFn = path.join(materialSymbolsBase, symbolsName + ".svg");
        if (!fs.existsSync(symbolsFn)) symbolsFn = undefined;

        // Going to remove Material Icons soon
        if (iconsFn && !symbolsFn) {
            const msg =
                `Icon '${name}' is resolved to Material Icon '${iconsName}', ` +
                `but it isn't found in Material Symbols, consider switching ` +
                `to Material Symbols (context ${ctx})`;
            console.warn(msg);
        }

        return symbolsFn ?? iconsFn;
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

// Material Icons contains lots of '*_outline/baseline' icons instead of
// '*/outline', so we need to remap them to use same names as Symbols.
const materialIconsRemap = {};
const stem = (fn) => fn.replace(/.*\/([^/]+\/[^/]+)\.svg$/, "$1");
for (const fn of glob.sync(materialIconsBase + "/*_outline/outline.svg")) {
    const fl = fn.replace(/_outline\/outline.svg$/, "/outline.svg");
    materialIconsRemap[stem(fl)] = stem(fn);
}

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
                    const resolved = collection(name, request.context?.issuer);
                    if (resolved) {
                        let symbolId = `icon-${col}-${parts.join("-")}`;
                        symbolId = symbolId.replace(/-outline$/, "");
                        iconFnToSymbolId[resolved] = symbolId;
                        request.request = resolved;
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
