import { applyTransform } from "ol/extent";
import { get as getProjection, getTransform } from "ol/proj";
import { useEffect, useMemo, useState } from "react";

import { useRoute } from "@nextgisweb/pyramid/hook";
import settings from "@nextgisweb/webmap/client-settings";
import { getDecPlacesRoundCoordByProj } from "@nextgisweb/webmap/utils/format-units";

import { useMapContext } from "../../map-component/context/useMapContext";

import { extentToWkt, parseWktGeometry, pointToWkt } from "./wkt-utils";

interface UseMeasurementProjCodeResult {
    isReady: boolean;
    displayProjection: string | undefined;
    displaySrsId: number | null;
    measureProjection: string | null;
    measureSrsId: number | undefined;
    transformFn: ((coordinate: number[]) => number[]) | null;
    isClientTransformAvailable: boolean;
}

function useMeasurementProjCode(): UseMeasurementProjCodeResult {
    const { mapStore } = useMapContext();

    const measureSrsId = mapStore.measureSrsId || settings.measurement_srid;
    const displayProjection = mapStore.displayProjection;

    const displaySrsId = useMemo(() => {
        if (!displayProjection) return null;
        try {
            const parts = displayProjection.split(":");
            const id = parseInt(parts[1], 10);
            return isNaN(id) ? null : id;
        } catch (e) {
            console.warn("Error parsing displayProjection", e);
            return null;
        }
    }, [displayProjection]);

    const measureProjection = useMemo(() => {
        if (!measureSrsId) return null;
        return `EPSG:${measureSrsId}`;
    }, [measureSrsId]);

    const isReady = Boolean(measureSrsId && displaySrsId);

    const transformFn = useMemo(() => {
        if (!isReady || !displayProjection || !measureProjection) return null;
        const projDisplay = getProjection(displayProjection);
        const projMeasure = getProjection(measureProjection);
        if (!projDisplay || !projMeasure) return null;

        if (displaySrsId === measureSrsId) {
            return (coordinate: number[]): number[] => coordinate;
        }

        return getTransform(displayProjection, measureProjection);
    }, [
        isReady,
        displayProjection,
        measureProjection,
        displaySrsId,
        measureSrsId,
    ]);

    const isClientTransformAvailable = useMemo(() => {
        return transformFn !== null;
    }, [transformFn]);

    return {
        isReady,
        displayProjection,
        displaySrsId,
        measureProjection,
        measureSrsId,
        transformFn,
        isClientTransformAvailable,
    };
}

interface UseProjectionsResult {
    transformedCoord: number[] | undefined;
    transformedExtent: number[] | undefined;
    roundDecPlaces: number;
    isClientTransformAvailable: boolean;
}

export const useProjections = (
    coord: number[] | undefined,
    extent: number[] | undefined,
    mode: "mouse" | "extent" = "mouse"
): UseProjectionsResult => {
    const [asyncCoord, setAsyncCoord] = useState<number[]>();
    const [asyncExtent, setAsyncExtent] = useState<number[]>();

    const {
        isReady,
        displaySrsId,
        measureSrsId,
        measureProjection,
        transformFn,
        isClientTransformAvailable,
    } = useMeasurementProjCode();

    const { route, abort } = useRoute("spatial_ref_sys.geom_transform.batch");

    const roundDecPlaces = useMemo(() => {
        if (!measureProjection) return 1;
        const proj = getProjection(measureProjection);
        return proj ? getDecPlacesRoundCoordByProj(proj) : 1;
    }, [measureProjection]);

    const clientResult = useMemo(() => {
        if (!isReady || !isClientTransformAvailable || !transformFn) {
            return { coord: undefined, extent: undefined };
        }

        if (displaySrsId === measureSrsId) {
            return { coord, extent };
        }

        return {
            coord: coord ? transformFn(coord) : undefined,
            extent: extent
                ? applyTransform(extent, transformFn, undefined)
                : undefined,
        };
    }, [
        isReady,
        isClientTransformAvailable,
        transformFn,
        displaySrsId,
        measureSrsId,
        coord,
        extent,
    ]);

    useEffect(() => {
        const noReady = !isReady || !displaySrsId || !measureSrsId;
        if (
            isClientTransformAvailable ||
            displaySrsId === measureSrsId ||
            noReady
        ) {
            return;
        }

        const geomWkt =
            mode === "mouse"
                ? coord
                    ? pointToWkt(coord)
                    : null
                : extent
                  ? extentToWkt(extent)
                  : null;

        if (!geomWkt) return;

        abort();

        route
            .post({
                json: {
                    srs_from: displaySrsId,
                    srs_to: [measureSrsId],
                    geom: geomWkt,
                },
            })
            .then((response) => {
                const resultWkt = response[0]?.geom;
                const parsed = parseWktGeometry(resultWkt);

                if (mode === "mouse") {
                    setAsyncCoord(parsed);
                } else {
                    setAsyncExtent(parsed);
                }
            })
            .catch((err) => {
                if (err.name !== "AbortError") {
                    console.error("Projection transform error", err);
                }
            });
    }, [
        isClientTransformAvailable,
        isReady,
        displaySrsId,
        measureSrsId,
        mode,
        coord,
        extent,
        route,
        abort,
    ]);

    return {
        transformedCoord: isClientTransformAvailable
            ? clientResult.coord
            : asyncCoord,
        transformedExtent: isClientTransformAvailable
            ? clientResult.extent
            : asyncExtent,
        roundDecPlaces,
        isClientTransformAvailable,
    };
};
