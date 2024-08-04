import type { CSSProperties } from "react";

export function mergeClasses(
    ...args: (string | false | undefined)[]
): string | undefined {
    const parts = args.filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : undefined;
}

export function mergeStyles(
    ...args: (CSSProperties | false | undefined)[]
): CSSProperties | undefined {
    const parts = args.filter(Boolean) as CSSProperties[];
    return parts.length > 0
        ? parts.reduce((prev, cur) => ({ ...prev, ...cur }), {})
        : undefined;
}
