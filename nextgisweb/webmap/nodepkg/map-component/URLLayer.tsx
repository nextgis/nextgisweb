import { observer } from "mobx-react-lite";
import { useEffect, useMemo } from "react";

import { isValidURL } from "@nextgisweb/gui/arm/validate";
import { useObjectState } from "@nextgisweb/gui/hook";
import type {
  TileLayerDefinition,
  TileLayerOptions,
} from "@nextgisweb/webmap/layer-adapter";

import { useMapContext } from "./context/useMapContext";
import { useMapLayer } from "./hook/useMapLayer";

export interface URLLayerProps {
  url: string;
  type?: TileLayerOptions["type"];
  opacity?: number;
  copyrightText?: string | null;
  copyrightUrl?: string | null;
  layerOptions?: TileLayerOptions["layer"];
  sourceOptions?: Pick<
    TileLayerOptions["source"],
    "minZoom" | "maxZoom" | "projection"
  >;
}

export const URLLayer = observer(function URLLayer({
  url,
  type = "tms",
  opacity,
  copyrightText,
  copyrightUrl,
  layerOptions: layerOptionsProp,
  sourceOptions: sourceOptionsProp,
}: URLLayerProps) {
  const { mapStore } = useMapContext();
  const { zoom } = mapStore;
  const [sourceOptions] = useObjectState(sourceOptionsProp);
  const [layerOptions] = useObjectState(layerOptionsProp || {});

  const layerDefinition = useMemo<TileLayerDefinition | undefined>(() => {
    if (!url || !isValidURL(url)) return;
    return {
      type: "tile",
      options: {
        type,
        layer: layerOptions,
        copyrightText,
        copyrightUrl,
        source: { url, wrapX: true, ...sourceOptions },
        request: { cache: "force-cache", noDataStatuses: [404, 204] },
      },
    };
  }, [url, type, layerOptions, sourceOptions, copyrightText, copyrightUrl]);

  const layer = useMapLayer(mapStore, layerDefinition);

  useEffect(() => {
    layer?.setZIndex(1);
  }, [layer]);

  useEffect(() => {
    if (layer && opacity !== undefined) {
      layer.setOpacity(opacity / 100);
    }
  }, [opacity, layer]);

  useEffect(() => {
    if (!layer) return;

    const isVisible = layerOptions.visible !== false;
    const isZoomAllowed =
      layerOptions.minZoom === undefined ||
      (zoom !== null && zoom > layerOptions.minZoom);

    layer.setVisibility(isVisible && isZoomAllowed);
  }, [layer, layerOptions.visible, layerOptions.minZoom, zoom]);

  return null;
});
