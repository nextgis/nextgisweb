import type OlMap from "ol/Map";
import Graticule from "ol/layer/Graticule";
import type { Options as GraticuleOptions } from "ol/layer/Graticule";
import { useEffect, useMemo } from "react";

export function GraticuleLayer({
  olMap,
  ...options
}: GraticuleOptions & { olMap: OlMap }) {
  const layer = useMemo(() => {
    return new Graticule(options);
  }, [options]);

  useEffect(() => {
    olMap.addLayer(layer);

    return () => {
      olMap.removeLayer(layer);
    };
  }, [olMap, layer]);

  return null;
}
