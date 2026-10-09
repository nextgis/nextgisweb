import type { StyleLike } from "ol/style/Style";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { RasterBand } from "@nextgisweb/raster-layer/type/api";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import type {
  ResourceLayerAdapter,
  ResourceLayerDefinition,
  ResourceLayerType,
} from "@nextgisweb/webmap/layer-adapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { BandSelectControl } from "../control/BandSelectControl";
import { RGBIntensityControl } from "../control/RGBIntensityControl";

import { useMapLayer } from "./useMapLayer";

export type LayerType = ResourceLayerType;

export interface LayerOptions {
  style?: StyleLike;
}

export function useNGWLayer({
  mapStore,
  layerType,
  resourceId,
  layerOptions,
}: {
  mapStore: MapStore;
  layerType: LayerType;
  resourceId: number;
  layerOptions?: LayerOptions;
}): [ResourceLayerAdapter | null, ReactElement | undefined] {
  const [geotiffMode, setGeotiffMode] = useState<
    "rgb" | "band" | "palette" | undefined
  >(undefined);
  const [bands, setBands] = useState<RasterBand[] | undefined>(undefined);
  const [selectedBand, setSelectedBand] = useState(0);
  const [alpha, setAlpha] = useState(100);
  const [rasterInfo, setRasterInfo] = useState<{
    resourceId: number;
    dtype?: string;
  }>();

  const { fetchResourceItems } = useResourceAttr();
  const raster =
    layerType === "geotiff" && rasterInfo?.resourceId === resourceId
      ? rasterInfo
      : undefined;
  const rasterBands = raster ? bands : undefined;

  const layerDefinition = useMemo<ResourceLayerDefinition>(
    () => ({
      type: "resource",
      resourceType: layerType,
      options: {
        resourceId,
        style: layerOptions?.style,
        raster: raster
          ? { dtype: raster.dtype, bands: rasterBands }
          : undefined,
      },
    }),
    [layerType, resourceId, layerOptions?.style, raster, rasterBands]
  );
  const layer = useMapLayer(mapStore, layerDefinition);

  const control = useMemo(() => {
    if (!geotiffMode || !bands || !layer?.setRasterStyle || !raster) {
      return undefined;
    }

    const hasAlpha = bands.some((b) => b.color_interp === "Alpha");

    if (geotiffMode === "rgb") {
      return (
        <RGBIntensityControl
          hasAlpha={hasAlpha}
          onChange={(rgb) => {
            layer.setRasterStyle?.({ mode: "rgb", ...rgb });
          }}
        />
      );
    }

    if (geotiffMode === "palette") {
      return (
        <BandSelectControl
          bands={bands}
          value={selectedBand}
          alphaValue={alpha}
          onChange={setSelectedBand}
          onAlphaChange={(val) => {
            setAlpha(val);

            layer.setRasterStyle?.({ mode: "palette", alpha: val });
          }}
        />
      );
    }

    return (
      <BandSelectControl
        bands={bands}
        value={selectedBand}
        alphaValue={alpha}
        onChange={(val) => {
          setSelectedBand(val);

          layer.setRasterStyle?.({ mode: "band", band: val, alpha });
        }}
        onAlphaChange={(val) => {
          setAlpha(val);

          layer.setRasterStyle?.({
            mode: "band",
            band: selectedBand,
            alpha: val,
          });
        }}
      />
    );
  }, [bands, geotiffMode, selectedBand, alpha, layer, raster]);

  useEffect(() => {
    let cancelled = false;

    const loadRasterInfo = async () => {
      setGeotiffMode(undefined);
      setBands(undefined);
      setSelectedBand(0);
      setAlpha(100);
      setRasterInfo(undefined);

      if (layerType === "geotiff") {
        const item = (
          await fetchResourceItems({
            resources: [resourceId],
            attributes: [["raster_layer.bands"], ["raster_layer.dtype"]],
          })
        )[0];
        if (cancelled || !item) return;

        const dtype = item.get("raster_layer.dtype");
        const bands = item.get("raster_layer.bands");

        setRasterInfo({ resourceId, dtype });
        setBands(bands);

        if (bands && bands.length > 1) {
          const hasAlpha = bands.some((b) => b.color_interp === "Alpha");

          const hasRGB =
            bands.findIndex((b) => b.color_interp === "Red") >= 0 &&
            bands.findIndex((b) => b.color_interp === "Green") >= 0 &&
            bands.findIndex((b) => b.color_interp === "Blue") >= 0;

          const hasPalette =
            bands.findIndex((b) => b.color_interp === "Palette") >= 0;

          const dataBands = bands.filter(
            (b) => b.color_interp !== "Alpha" && b.color_interp !== "Palette"
          );

          if (hasRGB) {
            setGeotiffMode("rgb");
          } else if (hasPalette && hasAlpha) {
            setGeotiffMode("palette");
          } else if (dtype !== "Byte" && (dataBands.length > 1 || hasAlpha)) {
            setGeotiffMode("band");
          }
        }
      }
    };

    loadRasterInfo().catch((error) => {
      if (!cancelled) console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, [layerType, resourceId, fetchResourceItems]);

  return [layer, control];
}
