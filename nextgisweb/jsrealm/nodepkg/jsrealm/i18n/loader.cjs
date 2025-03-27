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

    const tr = po.parse(fs.readFileSync(fn, "utf8")).translations;
    const dindex = {};
    for (const [context, messages] of Object.entries(tr)) {
        const cindex = (dindex[context] = []);
        for (const { msgid, comments } of Object.values(messages)) {
            const fstr = (comments || {}).flag;
            const flags = !fstr ? [] : fstr.split(/\s*,\s*/);
            const has = (flag) => flags.includes(flag);
            if (has("server") && !has("jsrealm")) continue;
            cindex.push(msgid);
        }
    }
    return dindex;
}

module.exports = function (source) {
    const comp = compFromPath(this.resourcePath);
    const flagged = potFlagged(comp);
    flagged || console.warn(`POT-file for '${comp}' component not found`);

    // Parse main translations
    const translations = po.parse(source).translations;

    // Parse AI translations if they exist
    const aiPath = this.resourcePath.replace(/\.po$/, ".ai.po");
    let aiTranslations = {};
    if (fs.existsSync(aiPath)) {
        const aiContent = fs.readFileSync(aiPath, "utf8");
        aiTranslations = po.parse(aiContent).translations;
    }

    const domainIndex = {};
    for (const [context, messages] of Object.entries(translations)) {
        const contextIndex = (domainIndex[context ? context : ""] = {});
        const cflagged = flagged && flagged[context];

        // Process main translations
        for (const { msgid, msgstr } of Object.values(messages)) {
            if (msgstr.includes("")) continue;
            if (cflagged && !cflagged.includes(msgid)) continue;
            contextIndex[msgid] = msgstr;
        }

        // Add AI translations if they exist and main translation is empty
        const aiMessages = aiTranslations[context] || {};
        for (const { msgid, msgstr } of Object.values(aiMessages)) {
            if (
                !contextIndex[msgid] &&
                msgstr &&
                (!cflagged || cflagged.includes(msgid))
            ) {
                contextIndex[msgid] = msgstr;
            }
        }
    }

    return [
        `import { load } from "@nextgisweb/jsrealm/i18n/catalog";`,
        `load("${comp}", ${JSON.stringify(domainIndex)})`,
    ].join("\n");
};
