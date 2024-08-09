import { createElement } from "react";
import type { ReactNode } from "react";

type PositionedParam = [message: string | number | ReactNode];
type NamedParam = { [key: string]: string | number | ReactNode };

const numsRegexp = /(?<!\{)\{(?!\{)\d+\}(?!\})/g;
const numsSplitRegexp = /(\{\{[^}]+\}\}|\{[^}]+\}|[^{}]+)/g;

const stringRegexp = /(?<!\{)\{(?!\{)[a-zA-Z_][a-zA-Z0-9_]*\}(?!\})/g;
const stringSplitRegexp = /(\{\{[^}]+\}\}|\{[^}]+\}|[^{}]+)/g;

// accroding to task, to support {} as a default place for interpolation with one param
const preprocessFormatNG = (input: string): string => {
    const output = input.includes("{}") ? input.replace("{}", "{0}") : input;
    return output;
};

const processEscaped = (
    result: string | number | ReactNode
): string | ReactNode => {
    if (typeof result === "string" || typeof result === "number") {
        return String(result).replaceAll("{{", "{").replaceAll("}}", "}");
    } else {
        return result;
    }
};

const compile = (template: string) => {
    const string = preprocessFormatNG(template);

    const numMatches = string.match(numsRegexp);
    const stringMatches = string.match(stringRegexp);

    if (!!stringMatches && !!numMatches) {
        throw new Error(
            "Templates with mixed params - string keys and numbers are not supported"
        );
    }

    if (numMatches && numMatches.length > 0) {
        return (...args: PositionedParam) => {
            if (args.length < numMatches.length) {
                throw new Error(
                    `Expected ${numMatches.length} arguments but got ${args.length}`
                );
            }

            const splitted = string.match(numsSplitRegexp) || [];

            const result = splitted.map((substring) => {
                const isParam = numMatches.includes(substring);

                if (isParam) {
                    const argIndex = parseInt(substring.slice(1, -1));
                    return args[argIndex];
                } else {
                    return substring;
                }
            });

            const escapedResult = result.map(processEscaped);
            return escapedResult;
        };
    }

    if (stringMatches && stringMatches.length > 0) {
        return (param: NamedParam) => {
            const entries = Object.entries(param);

            if (entries.length < stringMatches.length) {
                throw new Error(
                    `Expected ${stringMatches.length} arguments but got ${entries.length}`
                );
            }

            const splitted = string.match(stringSplitRegexp) || [];

            const result = splitted.map((substring) => {
                const isParam = stringMatches.includes(substring);

                if (isParam) {
                    const argKey = substring.slice(1, -1);

                    return param[argKey];
                } else {
                    return substring;
                }
            });

            const escapedResult = result.map(processEscaped);

            return escapedResult;
        };
    }

    return () => [processEscaped(template)];
};

const compileWrapper = (template: string) => {
    const outputFn = compile(template);

    return (...args: PositionedParam[] | NamedParam[]): string | ReactNode => {
        const tokens = outputFn(...args);

        // is there better way to check if it's React Component?
        if (tokens.some((token) => token && !!token.$$typeof)) {
            const fragment = createElement("Fragment", {}, ...tokens);
            return fragment;
        } else {
            return tokens.join("");
        }
    };
};

export default compileWrapper;
