import { shiftKeyOnly, singleClick } from "ol/events/condition";
import type { GeometryLayout } from "ol/geom/Geometry";
import { Draw, Modify } from "ol/interaction";
import type VectorSource from "ol/source/Vector";
import { useEffect } from "react";

import type { FeaureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import {
    getOlGeometryType,
    getOlLayout,
} from "@nextgisweb/webmap/utils/geometry-types";

export function DrawInteraction({
    source,
    multiGeometry = false,
    geometryType,
}: {
    source: VectorSource;
    multiGeometry?: boolean;
    geometryType: FeaureLayerGeometryType;
}) {
    const { mapStore } = useMapContext();

    useEffect(() => {
        if (!mapStore) {
            return;
        }

        const map = mapStore.olMap;
        const olType = getOlGeometryType(geometryType);
        const layout: GeometryLayout = getOlLayout(geometryType);

        const draw = new Draw({
            source,
            type: olType,
            geometryLayout: layout,
        });
        const modify = new Modify({
            source,
            deleteCondition: (e) => shiftKeyOnly(e) && singleClick(e),
        });

        if (!multiGeometry) {
            draw.on("drawstart", () => {
                source.clear();
            });
        }

        map.addInteraction(draw);
        map.addInteraction(modify);

        return () => {
            map.removeInteraction(draw);
            map.removeInteraction(modify);

            source.clear();
        };
    }, [mapStore, source, geometryType, multiGeometry]);

    return null;
}
