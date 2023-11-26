import type { Map } from "ol";
import { get as getProjection, transform, transformExtent } from "ol/proj";
import { useCallback, useEffect, useState } from "react";

import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import { getDecPlacesRoundCoordByProj } from "@nextgisweb/webmap/utils/format-units";

export const useProjections = (map: Map) => {
    const [measureProjCode, setMeasureProjCode] = useState<string>();
    const [mapProjCode, setMapProjCode] = useState<string>();
    const [roundDecPlaces, setRoundDecPlaces] = useState<number>();

    useEffect(() => {
        const mapProjection = map.getView().getProjection();
        const mapProjectionCode = mapProjection.getCode();

        if (!mapProjCode) {
            setMapProjCode(mapProjectionCode);
        }

        if (!measureProjCode) {
            const measurementProj = getProjection(
                `EPSG:${webmapSettings.measurement_srid}`
            );
            const measurementProjCode = measurementProj
                ? measurementProj.getCode()
                : mapProjCode;
            setMeasureProjCode(measurementProjCode);
            setRoundDecPlaces(
                getDecPlacesRoundCoordByProj(measurementProj || mapProjection)
            );
        }
    }, [map, mapProjCode, measureProjCode]);

    const transformCoords = useCallback(
        (coordinate: number[]): number[] => {
            if (measureProjCode === mapProjCode) {
                return coordinate;
            }
            return transform(coordinate, mapProjCode!, measureProjCode!);
        },
        [mapProjCode, measureProjCode]
    );

    const transformMapExtent = useCallback(
        (extent: number[]): number[] => {
            if (measureProjCode === mapProjCode) {
                return extent;
            }
            return transformExtent(extent, mapProjCode!, measureProjCode!);
        },
        [mapProjCode, measureProjCode]
    );

    return { transformCoords, transformMapExtent, roundDecPlaces };
};
