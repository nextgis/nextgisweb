const PKG_ICON = "@nextgisweb/icon/";
const COLLECTIONS = { mdi: "@mdi/svg", material: "@material-icons/svg" };

function normalize(col, p) {
    return col === "mdi" ? p.replace("_", "-") : p.replace("-", "_");
}

exports.COLLECTIONS = COLLECTIONS;

exports.IconResolverPlugin = class IconResolverPlugin {
    apply(resolver) {
        const hook = (request, resolveContext, callback) => {
            let r = request.request;

            if (r.startsWith(PKG_ICON)) {
                let [col, ...parts] = r.slice(PKG_ICON.length).split("/");

                if (["mdi", "material"].includes(col)) {
                    parts = parts
                        .filter((p) => p !== "svg")
                        .map((p) => normalize(col, p));

                    if (col === "material" && parts.length === 1) {
                        parts.push("baseline");
                    }

                    if (!parts[parts.length - 1].endsWith(".svg"))
                        parts[parts.length - 1] += ".svg";

                    request.request =
                        `${COLLECTIONS[col]}/svg/` + parts.join("/");
                }
            }

            callback();
        };

        resolver.getHook("resolve").tapAsync("IconResolverPlugin", hook);
    }
};

exports.symbolId = (fn) => {
    for (const [col, pkg] of Object.entries(COLLECTIONS)) {
        if (!fn.includes("/node_modules/" + pkg + "/")) continue;
        let id = fn.match(/\/(?:svg\/)+([\w-_/]+?)(?:\/baseline)?\.svg$/)[1];
        id = id.replace("/", "-");
        return `icon-${col}-${id}`;
    }
};
