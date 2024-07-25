// This code is made by sligthly modifying MIT Licenced project string-template by Matt-Esch
// https://github.com/Matt-Esch/string-template

const nargs = /\{([0-9a-zA-Z_]+)\}/g;

const template = (...args: string[]): string => {
    let operands: any;
    const string = args[0];

    if (args.length === 2 && typeof args[1] === "object") {
        operands = args[1];
    } else {
        operands = new Array(args.length - 1);
        for (let i = 1; i < args.length; ++i) {
            operands[i - 1] = args[i];
        }
    }

    if (!operands || !operands.hasOwnProperty) {
        operands = {};
    }

    return string.replace(nargs, function replaceArg(match, i, index) {
        if (string[index - 1] === "{" && string[index + match.length] === "}") {
            return i;
        } else {
            const result = operands.hasOwnProperty(i) ? operands[i] : null;
            if (result === null || result === undefined) {
                return "";
            }

            return result;
        }
    });
};

export default template;
