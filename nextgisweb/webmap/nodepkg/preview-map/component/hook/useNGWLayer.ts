import GeoJSON from "ol/format/GeoJSON";
import Tile from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import WebGLTileLayer from "ol/layer/WebGLTile";
import GeoTIFF from "ol/source/GeoTIFF";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { useMemo } from "react";

import { routeURL } from "@nextgisweb/pyramid/api";

export type LayerType = "geojson" | "geotiff" | "XYZ";

const createGeoJsonLayer = (resourceId: number) => {
    const url = routeURL("feature_layer.geojson", resourceId);
    const layer = new VectorLayer({
        source: new VectorSource({ url: url, format: new GeoJSON() }),
    });
    return layer;
};

const createGeoTIFFLayer = (resourceId: number) => {
    const url = routeURL("raster_layer.cog", resourceId);
    const layer = new WebGLTileLayer({
        source: new GeoTIFF({ sources: [{ url: url }] }),
    });
    return layer;
};

const createXYZLayer = (resourceId: number) => {
    const url =
        routeURL("render.tile") +
        `?resource=${resourceId}&x={x}&y={y}&z={z}&nd=204`;
    const layer = new Tile({
        source: new XYZ({ wrapX: false, url: url }),
    });
    return layer;
};

export function useNGWLayer({
    layerType,
    resourceId,
}: {
    layerType: LayerType;
    resourceId: number;
}) {
    const layer = useMemo(() => {
        if (layerType === "geojson") {
            return createGeoJsonLayer(resourceId);
        } else if (layerType === "geotiff") {
            return createGeoTIFFLayer(resourceId);
        } else {
            return createXYZLayer(resourceId);
        }
    }, [layerType, resourceId]);
    return layer;
}
