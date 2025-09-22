import Graticule from "ol/layer/Graticule";
import type { Options as GraticuleOptions } from "ol/layer/Graticule";
import { useEffect, useMemo } from "react";

import { useMapContext } from "../context/useMapContext";

export function GraticuleLayer(options: GraticuleOptions) {
    const { mapStore: adapter } = useMapContext();

    const layer = useMemo(() => {
        return new Graticule(options);
    }, [options]);

    useEffect(() => {
        if (!adapter?.olMap) return;

        adapter.olMap.addLayer(layer);

        return () => {
            adapter.olMap.removeLayer(layer);
        };
    }, [adapter.olMap, layer]);

    return null;
}
