const { po } = require("gettext-parser");

function compFromPath(path) {
    // Builtin
    const mb = path.match(/\/(?:nextgisweb_)?(\w+)\/locale\/[a-z-]+\.po$/);
    if (mb) return mb[1];

    // External
    const me = path.match(/\/nextgisweb.*\/(\w+)\/[a-z-]+\.po$/);
    if (me) return me[1];
}

module.exports = function (source) {
    const translations = po.parse(source).translations;
    const domainIndex = {};
    for (const [context, messages] of Object.entries(translations)) {
        const contextIndex = (domainIndex[context ? context : ""] = {});
        for (const [id, msg] of Object.entries(messages)) {
            // Skip untranslated messages
            if (msg.msgstr.includes("")) continue;

            // Skip server-only messages
            const fstr = (msg.comments || {}).flag;
            const flags = !fstr ? [] : fstr.split(/\s*,\s*/);
            const has = (flag) => flags.includes(flag);
            if (has("server") && !has("amd") && !has("jsrealm")) continue;

            // Write messages
            contextIndex[id] = msg.msgstr;
        }
    }

    const comp = compFromPath(this.resourcePath);
    return [
        `import { load } from "@nextgisweb/jsrealm/i18n/catalog";`,
        `load("${comp}", ${JSON.stringify(domainIndex)})`,
    ].join("\n");
};
