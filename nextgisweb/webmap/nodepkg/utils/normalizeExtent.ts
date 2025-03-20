import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

export function isExtentValid([minX, minY, maxX, maxY]: number[]): boolean {
    return (
        minX >= -180 &&
        minX <= 180 &&
        maxX >= -180 &&
        maxX <= 180 &&
        minY >= -90 &&
        minY <= 90 &&
        maxY >= -90 &&
        maxY <= 90 &&
        minX <= maxX &&
        minY <= maxY
    );
}

export function normalizeExtent(
    extent: ExtentWSEN,
    fallback: ExtentWSEN = [-180, -90, 180, 90]
): ExtentWSEN {
    if (isExtentValid(extent)) return extent;
    const [lonA, latA, lonB, latB] = extent;
    const minLon = Math.min(lonA, lonB);
    const maxLon = Math.max(lonA, lonB);
    const minLat = Math.min(latA, latB);
    const maxLat = Math.max(latA, latB);

    const normalized: ExtentWSEN = [minLon, minLat, maxLon, maxLat];

    if (isExtentValid(normalized)) {
        console.error(
            `Input extent [${extent}] is invalid. Using normalized extent [${normalized}].`
        );
        return normalized;
    }
    console.error(
        `Input extent [${extent}] remains invalid even after attempted normalization ([${normalized}]). Using fallback extent [${fallback}].`
    );
    return fallback;
}
