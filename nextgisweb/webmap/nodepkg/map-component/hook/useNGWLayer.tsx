import { MVT } from "ol/format";
import GeoJSON from "ol/format/GeoJSON";
import type BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
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
import { createGeoTIFFLayer } from "@nextgisweb/webmap/geotiff-adapter/createGeoTIFFLayer";
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
  const [control, setControl] = useState<ReactElement | undefined>(undefined);
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

        setLayer(createGeoTIFFLayer({ styleId: resourceId, dtype, bands }));

        if (dtype !== "Byte" && bands && bands.length > 1) {
          setControl(
            <BandSelectControl
              bands={bands}
              onChange={(val) => {
                setLayer(
                  createGeoTIFFLayer({
                    styleId: resourceId,
                    dtype,
                    bands,
                    selectedBand: val,
                  })
                );
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
