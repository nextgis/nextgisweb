import type { ExtentRowValue } from "./ExtentRow";

export function unionExtents(extents: ExtentRowValue[]): ExtentRowValue {
    const lefts = extents.map((e) => e.left ?? 0);
    const bottoms = extents.map((e) => e.bottom ?? 0);
    const rights = extents.map((e) => e.right ?? 0);
    const tops = extents.map((e) => e.top ?? 0);

    return {
        left: Math.min(...lefts),
        bottom: Math.min(...bottoms),
        right: Math.max(...rights),
        top: Math.max(...tops),
    };
}
