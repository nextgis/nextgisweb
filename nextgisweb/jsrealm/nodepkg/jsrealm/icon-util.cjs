// prettier-ignore
const reReq = /@material-icons\/(?:svg\/){1,2}(?<glyph>\w+)(?:\/(?<variant>\w+))?(?:\.svg)?/,
    reFname = /node_modules\/@material-icons\/svg\/svg\/(?<glyph>\w+)\/(?<variant>\w+)\.svg/;

function glyphAndVariant(req) {
    const match = req.match(reReq);
    if (match) {
        const { glyph, variant } = match.groups;
        return glyph + "/" + (variant || "baseline");
    }
}

exports.IconResolverPlugin = class IconResolverPlugin {
    apply(resolver) {
        resolver
            .getHook("resolve")
            .tapAsync(
                "IconResolverPlugin",
                (request, resolveContext, callback) => {
                    const fn = request.request;
                    const gv = glyphAndVariant(fn);
                    if (gv) {
                        request.request = `@material-icons/svg/svg/${gv}.svg`;
                    }
                    callback();
                }
            );
    }
};

exports.symbolId = (fn) => {
    const match = fn.match(reFname);
    if (match) {
        const { glyph, variant } = match.groups;
        return (
            `icon-material-${glyph}` +
            (variant === "baseline" ? "" : `-${variant}`)
        );
    }
};
