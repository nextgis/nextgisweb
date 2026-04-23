import { MVT } from "ol/format";
import GeoJSON from "ol/format/GeoJSON";
import type BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import WebGLTileLayer from "ol/layer/WebGLTile";
import GeoTIFFSource from "ol/source/GeoTIFF";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";
import type { StyleLike } from "ol/style/Style";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import { createImageLayer as createNGWImageLayer } from "@nextgisweb/webmap/image-adapter/createImageLayer";
import { createTileLayer } from "@nextgisweb/webmap/tile-adapter/createTileLayer";

import { MapControl } from "../control";

export type LayerType = "geojson" | "geotiff" | "XYZ" | "MVT" | "image";

export interface LayerOptions {
  style?: StyleLike;
}

const msgBand = gettextf("Band {}");

const createGeoJsonLayer = (
  resourceId: number,
  layerOptions?: LayerOptions
) => {
  const url = routeURL("feature_layer.geojson", resourceId);
  const layer = new VectorLayer({
    source: new VectorSource({ url: url, format: new GeoJSON() }),
    ...layerOptions,
  });
  return layer;
};

const createGeoTIFFLayer = (
  resourceId: number,
  dtype?: string,
  bands?: RasterBand[],
  selectedBand?: number
) => {
  const url = routeURL("raster_layer.cog", resourceId);
  const isNormalizable = dtype !== "Byte";

  if (isNormalizable && bands) {
    const alphaIdx = bands.findIndex((b) => b.color_interp === "Alpha");

    const dataIdx =
      selectedBand !== undefined
        ? selectedBand
        : bands.findIndex((b) => b.color_interp !== "Alpha");

    if (dataIdx >= 0 && bands[dataIdx]) {
      const dataBand = bands[dataIdx];
      const min = dataBand.min ?? 0;
      const max = dataBand.max ?? 1;
      const olDataIdx = dataIdx + 1; // OL band indices are 1-based
      const range = max - min || 1;

      const normalized = [
        "clamp",
        ["/", ["-", ["band", olDataIdx], min], range],
        0,
        1,
      ];
      const nodata =
        typeof dataBand.no_data === "number" ? dataBand.no_data : undefined;
      const alpha =
        alphaIdx >= 0
          ? ["/", ["band", alphaIdx + 1], 255]
          : nodata !== undefined
            ? ["case", ["==", ["band", olDataIdx], nodata], 0, 1]
            : 1;

      return new WebGLTileLayer({
        source: new GeoTIFFSource({
          sources: [{ url, nodata }],
          normalize: false,
        }),
        style: { color: ["array", normalized, normalized, normalized, alpha] },
      });
    }
  }

  return new WebGLTileLayer({
    source: new GeoTIFFSource({ sources: [{ url }], convertToRGB: true }),
  });
};
const createXYZLayer = (resourceId: number) => {
  const layer = createTileLayer({ styleId: resourceId });
  return layer.olLayer;
};

const createImageLayer = (resourceId: number) => {
  const layer = createNGWImageLayer({ styleId: resourceId });
  return layer.olLayer;
};

const createMVTLayer = (resourceId: number, layerOptions?: LayerOptions) => {
  const url =
    routeURL("feature_layer.mvt") +
    `?resource=${resourceId}&x={x}&y={y}&z={z}&nd=204`;
  const source = new VectorTileSource({
    format: new MVT(),
    url,
  });
  return new VectorTileLayer({
    source,
    ...layerOptions,
  });
};

function BandSelectControl({
  bands,
  value = 0,
  onChange,
}: {
  bands: RasterBand[];
  value?: number;
  onChange: (val: number) => void;
}) {
  const bandsWithoutAlpha = bands.filter((b) => b.color_interp !== "Alpha");

  if (bandsWithoutAlpha.length < 2) {
    return null;
  }

  return (
    <MapControl order={100} position="top-right" margin>
      <Select
        defaultValue={value}
        onChange={onChange}
        options={bandsWithoutAlpha?.map((_b, index) => ({
          value: index,
          label: msgBand(index + 1),
        }))}
      />
    </MapControl>
  );
}

export function useNGWLayer({
  layerType,
  resourceId,
  layerOptions,
}: {
  layerType: LayerType;
  resourceId: number;
  layerOptions?: LayerOptions;
}): [BaseLayer | undefined, ReactElement | undefined] {
  const [layer, setLayer] = useState<BaseLayer | undefined>(undefined);
  const [control, setControl] = useState<React.ReactElement | undefined>(
    undefined
  );
  const { fetchResourceItems } = useResourceAttr();

  useEffect(() => {
    let cancelled = false;

    const loadLayer = async () => {
      if (layerType === "geojson") {
        return setLayer(createGeoJsonLayer(resourceId, layerOptions));
      } else if (layerType === "MVT") {
        return setLayer(createMVTLayer(resourceId, layerOptions));
      } else if (layerType === "image") {
        return setLayer(createImageLayer(resourceId));
      }
      if (layerType === "XYZ") {
        return setLayer(createXYZLayer(resourceId));
      }
      if (layerType === "geotiff") {
        const item = (
          await fetchResourceItems({
            resources: [resourceId],
            attributes: [["raster_layer.bands"], ["raster_layer.dtype"]],
          })
        )[0];
        if (cancelled || !item) return [];

        const dtype = item.get("raster_layer.dtype");
        const bands = item.get("raster_layer.bands");

        setLayer(createGeoTIFFLayer(resourceId, dtype, bands));

        if (dtype !== "Byte" && bands && bands.length > 1) {
          setControl(
            <BandSelectControl
              bands={bands}
              onChange={(val) => {
                setLayer(createGeoTIFFLayer(resourceId, dtype, bands, val));
              }}
            />
          );
        }
      } else {
        throw new Error(`Not supported layer type: ${layerType}`);
      }
    };

    loadLayer();

    return () => {
      cancelled = true;
    };
  }, [layerType, resourceId, layerOptions, fetchResourceItems]);

  return [layer, control];
}
