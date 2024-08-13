import { Fragment, createElement } from "react";
import type { ReactNode } from "react";

import { castCompiled } from "./format";
import type { FormatArray, FormatObject } from "./format";
import type { FormatFunc } from "./gettext";

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
