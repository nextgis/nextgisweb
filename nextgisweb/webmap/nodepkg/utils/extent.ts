import type { ExtentRowValue } from "@nextgisweb/gui/component";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

export const convertExtentToArray = (
    extent: ExtentRowValue
): ExtentWSEN | null | undefined => {
    const { left, bottom, right, top } = extent;

    if (
        [left, bottom, right, top].some(
            (value) => value === undefined || value === null
        )
    ) {
        return null;
    }

    return [left, bottom, right, top] as ExtentWSEN;
};

export const extractExtentFromArray = (
    extentArray?: (number | null | undefined)[] | null
): ExtentRowValue => {
    return {
        left: extentArray?.[0] ?? null,
        bottom: extentArray?.[1] ?? null,
        right: extentArray?.[2] ?? null,
        top: extentArray?.[3] ?? null,
    };
};
