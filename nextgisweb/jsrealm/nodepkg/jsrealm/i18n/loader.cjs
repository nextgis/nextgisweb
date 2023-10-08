const fs = require("fs");
const path = require("path");

const { po } = require("gettext-parser");

const { env } = require("../config.cjs");

function compFromPath(path) {
    // Builtin
    const mb = path.match(/\/(?:nextgisweb_)?(\w+)\/locale\/[a-z-]+\.po$/);
    if (mb) return mb[1];

    // External
    const me = path.match(/\/nextgisweb.*\/(\w+)\/[a-z-]+\.po$/);
    if (me) return me[1];
}

function potFlagged(comp) {
    if (!(comp in env.components)) return;
    const fn = path.resolve(env.components[comp], "locale/.pot");
    if (!fs.existsSync(fn)) return;

    const tr = po.parse(fs.readFileSync(fn)).translations;
    const dindex = {};
    for (const [context, messages] of Object.entries(tr)) {
        const cindex = (dindex[context] = []);
        for (const { msgid, comments } of Object.values(messages)) {
            const fstr = (comments || {}).flag;
            const flags = !fstr ? [] : fstr.split(/\s*,\s*/);
            const has = (flag) => flags.includes(flag);
            if (has("server") && !has("amd") && !has("jsrealm")) continue;
            cindex.push(msgid);
        }
    }
    return dindex;
}

module.exports = function (source) {
    const comp = compFromPath(this.resourcePath);
    const flagged = potFlagged(comp);
    flagged || console.warn(`POT-file for '${comp}' component not found`);

    const translations = po.parse(source).translations;
    const domainIndex = {};
    for (const [context, messages] of Object.entries(translations)) {
        const contextIndex = (domainIndex[context ? context : ""] = {});
        const cflagged = flagged && flagged[context];
        for (const { msgid, msgstr } of Object.values(messages)) {
            if (msgstr.includes("")) continue;
            if (cflagged && !cflagged.includes(msgid)) continue;
            contextIndex[msgid] = msgstr;
        }
    }

    return [
        `import { load } from "@nextgisweb/jsrealm/i18n/catalog";`,
        `load("${comp}", ${JSON.stringify(domainIndex)})`,
    ].join("\n");
};
