const numsRegexp = /(?<!\{)\{(?!\{)\d+\}(?!\})/g;

const stringRegexp = /(?<!\{)\{(?!\{)[a-zA-Z_][a-zA-Z0-9_]*\}(?!\})/g;

// accroding to task, to support {} as a default place for interpolation with one param
const preprocessFormatNG = (input: string): string => {
    const output = input.includes("{}") ? input.replace("{}", "{0}") : input;
    return output;
};

const processEscaped = (result: string) => {
    return result.replaceAll("{{", "{").replaceAll("}}", "}");
};

export default (input: string) => {
    const string = preprocessFormatNG(input);

    const numMatches = string.match(numsRegexp);

    const stringMatches = string.match(stringRegexp);

    if (!!stringMatches && !!numMatches) {
        throw new Error(
            "Templates with mixed params - string keys and numbers are not supported"
        );
    }

    if (numMatches && numMatches.length > 0) {
        return (...args: [string]) => {
            const cleanNumMatches = numMatches.map((match) => {
                return parseInt(match.slice(1, -1));
            });

            if (args.length < numMatches.length) {
                throw new Error(
                    `Expected ${numMatches.length} arguments but got ${args.length}`
                );
            }

            let result = string;
            for (let i = 0; i < numMatches.length; i++) {
                result = result.replace(
                    numMatches[i],
                    args[cleanNumMatches[i]]
                );
            }
            return processEscaped(result);
        };
    }

    if (stringMatches && stringMatches.length > 0) {
        return (param: { [key: string]: string }) => {
            const entries = Object.entries(param);
            const cleanStringMatches = stringMatches.map((match) => {
                return match.slice(1, -1);
            });

            if (entries.length < stringMatches.length) {
                throw new Error(
                    `Expected ${stringMatches.length} arguments but got ${entries.length}`
                );
            }

            let result = string;
            for (let i = 0; i < stringMatches.length; i++) {
                result = result.replace(
                    stringMatches[i],
                    param[cleanStringMatches[i]]
                );
            }
            return processEscaped(result);
        };
    }

    // console.log("DEFAULT USED");
    return () => processEscaped(input);
};
