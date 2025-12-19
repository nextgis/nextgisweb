import { uniq } from "lodash-es";

type Param<T = never> = string | number | T;
export type FormatArray<T = never> = [...args: Param<T>[]];
export type FormatObject<T = never> = Record<string, Param<T>>;
export type FormatArgs<T = never> = FormatArray<T> | [FormatObject<T>];
export type Compiled<A = never, R = string> = (...args: FormatArgs<A>) => R[];

const numsRegexp = /(?:{*)(\d)(?:}*)/g;

const stringRegexp = /(?:{*)(\{(?!\{)[a-zA-Z_][a-zA-Z0-9_]*\}(?!\}))(?:}*)/g;

const tokenSplitRegexp = /(\{\{[^}]+\}\}|\{[^}]+\}|[^{}]+)/g;

const preprocessFormatNG = (input: string): string => {
    const output = input.includes("{}") ? input.replace("{}", "{0}") : input;
    return output;
};

const processEscaped = <A = never>(result: Param<A>): string => {
    if (typeof result === "string" || typeof result === "number") {
        return String(result).replaceAll("{{", "{").replaceAll("}}", "}");
    } else {
        return result as string;
    }
};

export function compile(template: string): Compiled {
    const string = preprocessFormatNG(template);

    const numMatches = string
        .match(numsRegexp)
        ?.filter((el) => !el.includes("{{") && !el.includes("}}"));

    const stringMatches = string
        .match(stringRegexp)
        ?.filter((el) => !el.includes("{{") && !el.includes("}}"));

    if (!!stringMatches && !!numMatches) {
        throw new Error(
            "Templates with mixed params - string keys and numbers are not supported"
        );
    }

    if (numMatches && numMatches.length > 0) {
        const compileArray = <A = never>(...args: FormatArray<A>): string[] => {
            if (args.length < uniq(numMatches).length) {
                throw new Error(
                    `Expected ${numMatches.length} arguments but got ${args.length}`
                );
            }

            const splitted = string.match(tokenSplitRegexp) || [];

            const result = splitted.map((substring: string) => {
                const isParam = numMatches.includes(substring);

                if (isParam) {
                    const argIndex = parseInt(substring.slice(1, -1));
                    return args[argIndex];
                } else {
                    return substring;
                }
            });

            const escapedResult = result.map((token) => processEscaped(token));
            return escapedResult;
        };
        return compileArray;
    }

    if (stringMatches && stringMatches.length > 0) {
        const compileObject = <A = never>(param: FormatObject<A>): string[] => {
            const entries = Object.entries(param);

            if (entries.length < uniq(stringMatches).length) {
                throw new Error(
                    `Expected ${stringMatches.length} arguments but got ${entries.length}`
                );
            }

            const splitted = string.match(tokenSplitRegexp) || [];
            const result = splitted.map((substring: string) => {
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

        return compileObject as Compiled; // TODO find other way
    }

    return (): string[] => [processEscaped(template)];
}

export function castCompiled<T>(compiled: Compiled): Compiled<T, string | T> {
    return compiled as Compiled<T, string | T>;
}
