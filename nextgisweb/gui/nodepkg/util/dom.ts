import classNames from "classnames";
import type { CSSProperties } from "react";

/** @deprecated Replace with classNames provided by the classnames library */
export function mergeClasses(
    ...args: (string | false | undefined)[]
): string | undefined {
    return classNames(...args);
}

export function mergeStyles(
    ...args: (CSSProperties | false | undefined)[]
): CSSProperties | undefined {
    const parts = args.filter(Boolean) as CSSProperties[];
    return parts.length > 0
        ? parts.reduce((prev, cur) => ({ ...prev, ...cur }), {})
        : undefined;
}
