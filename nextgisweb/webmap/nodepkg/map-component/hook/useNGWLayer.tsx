import { MVT } from "ol/format";
import GeoJSON from "ol/format/GeoJSON";
import type BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import type WebGLTileLayer from "ol/layer/WebGLTile";
import VectorSource from "ol/source/Vector";
import VectorTileSource from "ol/source/VectorTile";
import type { StyleLike } from "ol/style/Style";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import {
  createGeoTIFFLayer,
  createGeoTIFFPaletteStyle,
  setGeoTIFFBandStyle,
  setGeoTIFFRGBIntensityStyle,
} from "@nextgisweb/webmap/geotiff-adapter/createGeoTIFFLayer";
import { createImageLayer as createNGWImageLayer } from "@nextgisweb/webmap/image-adapter/createImageLayer";
import { createTileLayer } from "@nextgisweb/webmap/tile-adapter/createTileLayer";

import { BandSelectControl } from "../control/BandSelectControl";
import { RGBIntensityControl } from "../control/RGBIntensityControl";

export type LayerType = "geojson" | "geotiff" | "XYZ" | "MVT" | "image";

export interface LayerOptions {
  style?: StyleLike;
}

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

const createXYZLayer = (resourceId: number, hmux?: boolean) => {
  const layer = createTileLayer({ styleId: resourceId }, { hmux });
  return layer.olLayer;
};

const createImageLayer = (resourceId: number, hmux?: boolean) => {
  const layer = createNGWImageLayer({ styleId: resourceId }, { hmux });
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
  const [geotiffMode, setGeotiffMode] = useState<
    "rgb" | "band" | "palette" | undefined
  >(undefined);
  const [bands, setBands] = useState<RasterBand[] | undefined>(undefined);
  const [selectedBand, setSelectedBand] = useState(0);
  const [alpha, setAlpha] = useState(100);

  const geotiffLayerRef = useRef<WebGLTileLayer | null>(null);
  const { fetchResourceItems } = useResourceAttr();

  const control = useMemo(() => {
    if (!geotiffMode || !bands) return undefined;

    const hasAlpha = bands.some((b) => b.color_interp === "Alpha");

    if (geotiffMode === "rgb") {
      return (
        <RGBIntensityControl
          hasAlpha={hasAlpha}
          onChange={(rgb) => {
            if (geotiffLayerRef.current) {
              setGeoTIFFRGBIntensityStyle(geotiffLayerRef.current, bands, rgb);
            }
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

            const style = createGeoTIFFPaletteStyle(bands, true, val);

            if (style && geotiffLayerRef.current) {
              geotiffLayerRef.current.setStyle(style);
            }
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

          if (geotiffLayerRef.current) {
            setGeoTIFFBandStyle(geotiffLayerRef.current, bands, val, alpha);
          }
        }}
        onAlphaChange={(val) => {
          setAlpha(val);

          if (geotiffLayerRef.current) {
            setGeoTIFFBandStyle(
              geotiffLayerRef.current,
              bands,
              selectedBand,
              val
            );
          }
        }}
      />
    );
  }, [bands, geotiffMode, selectedBand, alpha]);

  useEffect(() => {
    let cancelled = false;

    const loadLayer = async () => {
      setGeotiffMode(undefined);
      setBands(undefined);
      setSelectedBand(0);
      setAlpha(100);
      geotiffLayerRef.current = null;

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

        const geotiffLayer = createGeoTIFFLayer({
          styleId: resourceId,
          dtype,
          bands,
        });

        geotiffLayerRef.current = geotiffLayer;
        setLayer(geotiffLayer);

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
            setBands(bands);
            setGeotiffMode("rgb");
          } else if (hasPalette && hasAlpha) {
            setBands(bands);
            setGeotiffMode("palette");
          } else if (dtype !== "Byte" && (dataBands.length > 1 || hasAlpha)) {
            setBands(bands);
            setGeotiffMode("band");
          }
        }

        return;
      }

      throw new Error(`Not supported layer type: ${layerType}`);
    };

    loadLayer();

    return () => {
      cancelled = true;
    };
  }, [layerType, resourceId, fetchResourceItems, layerOptions]);

  return [layer, control];
}
