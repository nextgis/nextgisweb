const fs = require("fs");
const doctrine = require("doctrine");

const extractRegexp = /\/\*\*.*(?:\*\/$|$(?:\s*\*\s?.*$)*\s*\*\/)/m;

module.exports = function tagParser(fn) {
    const body = fs.readFileSync(fn, { encoding: "utf-8" });
    const match = extractRegexp.exec(body);
    if (match) {
        const jsdoc = match[0];
        const payload = doctrine.parse(jsdoc, {
            unwrap: true,
            tags: ["entrypoint"],
        });
        for (const { title } of payload.tags) {
            return { type: title };
        }
    }
};
