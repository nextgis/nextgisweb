import { Fragment, createElement } from "react";
import type { ReactNode } from "react";

import type { FormatFunc } from "./gettext";
import { castCompiled } from "./string-format/compile";
import type { FormatArray, FormatObject } from "./string-format/compile";

export interface TranslatedProps {
    msgf: FormatFunc;
    args: FormatArray<ReactNode> | FormatObject<ReactNode>;
}

export function Translated({ msgf, args }: TranslatedProps) {
    const compiled = castCompiled<ReactNode>(msgf.compiled);
    const argsc = !Array.isArray(args)
        ? ([args] as [FormatObject<ReactNode>])
        : args;
    return createElement(Fragment, {}, compiled(...argsc));
}
