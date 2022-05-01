exports.IconResolverPlugin = class IconResolverPlugin {
	constructor({shared}) {
        this.shared = shared;
	}

	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver.getHook("resolve").tapAsync(
            "IconResolverPlugin", (request, resolveContext, callback) => {
                const req = request.request;
                if (req.startsWith("@material-icons/svg/")) {
                    const m = req.match(/\@material-icons\/svg\/(?:svg\/)?(?<glyph>\w+)(?:\/(?<variant>\w+))?(?:\.svg)?/);
                    if (m) {
                        const { glyph, variant } = m.groups;
                        const newRequest = "@material-icons/svg/svg/" + glyph + "/" + (variant || "baseline") + ".svg";
                        request.request = newRequest;
                    }
                } else if (req == "@nextgisweb/jsrealm/shared-icon") {
                    request.request = this.shared;
                }
                callback();
        });
    }
}

exports.iconSymbolId = (fn) => {
    const material = fn.match(/node_modules\/\@material-icons\/svg\/svg\/(?<glyph>\w+)\/(?<variant>\w+)\.svg/);
    if (material) {
        const {glyph, variant} = material.groups;
        return `icon-material-${glyph}` + (variant == "baseline" ? "" : `-${variant}`);
    }
}
