import type { Coordinate } from "ol/coordinate";
import * as olProj from "ol/proj";
import type { ProjectionLike } from "ol/proj";

export function scaleForResolution({
    resolution,
    projection,
    dpi,
    ipm,
    center,
}: {
    resolution: number;
    projection: ProjectionLike;
    dpi: number;
    ipm: number;
    center?: Coordinate;
}): number {
    let mpp: number;

    if (center) {
        mpp = olProj.getPointResolution(projection, resolution, center, "m");
    } else {
        const proj = olProj.get(projection);
        const mpu = proj?.getMetersPerUnit?.() ?? 1;
        mpp = resolution * mpu;
    }

    return Math.round(mpp * dpi * ipm);
}
