// This code is made by sligthly modifying MIT Licenced project string-template by Matt-Esch
// https://github.com/Matt-Esch/string-template

import template from "./index";

const whitespaceRegex = /["'\\\n\r\u2028\u2029]/g;
const nargs = /\{[0-9a-zA-Z]+\}/g;

const replaceTemplate =
    "    var args\n" +
    "    var result\n" +
    '    if (arguments.length === 1 && typeof arguments[0] === "object") {\n' +
    "        args = arguments[0]\n" +
    "    } else {\n" +
    "        args = arguments" +
    "    }\n\n" +
    '    if (!args || !("hasOwnProperty" in args)) {\n' +
    "       args = {}\n" +
    "    }\n\n" +
    "    return {0}";

const literalTemplate = '"{0}"';
const argTemplate =
    '(result = args.hasOwnProperty("{0}") ? ' +
    'args["{0}"] : null, \n        ' +
    '(result === null || result === undefined) ? "" : result)';

const escapedWhitespace = (character: string): string => {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
        case '"':
        case "'":
        case "\\":
            return "\\" + character;
        // Four possible LineTerminator characters need to be escaped:
        case "\n":
            return "\\n";
        case "\r":
            return "\\r";
        case "\u2028":
            return "\\u2028";
        case "\u2029":
            return "\\u2029";
        default:
            return "";
    }
};

const escape = (string: string): string => {
    string = "" + string;
    return string.replace(whitespaceRegex, escapedWhitespace);
};

// accroding to task, to support {} as place for interpolation
const preprocessFormatNG = (input: string): string => {
    const output = input.includes("{}") ? input.replace("{}", "{0}") : input;
    return output;
};

export default (input: string, inline?: boolean) => {
    const string = preprocessFormatNG(input);
    const replacements = string.match(nargs) || [];
    const interleave = string.split(nargs);
    let replace: string[] | { name: string }[] = [];

    for (let i = 0; i < interleave.length; i++) {
        const current = interleave[i];
        let replacement = replacements[i];
        const escapeLeft = current.charAt(current.length - 1);
        const escapeRight = (interleave[i + 1] || "").charAt(0);

        if (replacement) {
            replacement = replacement.substring(1, replacement.length - 1);
        }

        if (escapeLeft === "{" && escapeRight === "}") {
            replace.push(current + replacement);
        } else {
            replace.push(current);
            if (replacement) {
                replace.push({ name: replacement });
            }
        }
    }

    const prev = [""];

    for (let j = 0; j < replace.length; j++) {
        const curr = replace[j];

        if (String(curr) === curr) {
            const top = prev[prev.length - 1];

            if (String(top) === top) {
                prev[prev.length - 1] = top + curr;
            } else {
                prev.push(curr);
            }
        } else {
            prev.push(curr);
        }
    }

    replace = prev;

    if (inline) {
        for (let k = 0; k < replace.length; k++) {
            const token = replace[k];

            if (String(token) === token) {
                replace[k] = template(literalTemplate, escape(token));
            } else {
                replace[k] = template(argTemplate, escape(token.name));
            }
        }

        const replaceCode = replace.join(" +\n    ");
        const compiledSource = template(replaceTemplate, replaceCode);
        return new Function(compiledSource);
    }

    return function template(...args: any | any[]) {
        // let args;

        if (arguments.length === 1 && typeof arguments[0] === "object") {
            args = arguments[0];
        } else {
            args = arguments;
        }

        if (!args || !("hasOwnProperty" in args)) {
            args = {};
        }

        const result = [];

        for (let i = 0; i < replace.length; i++) {
            if (i % 2 === 0) {
                result.push(replace[i]);
            } else {
                const argName = replace[i].name;
                const arg = args.hasOwnProperty(argName) ? args[argName] : null;
                if (arg !== null || arg !== undefined) {
                    result.push(arg);
                }
            }
        }

        return result.join("");
    };
};
