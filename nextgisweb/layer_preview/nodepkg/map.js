/** @entrypoint */
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import { fromExtent } from "ol/geom/Polygon";
import Tile from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import WebGLTileLayer from "ol/layer/WebGLTile";
import { fromLonLat, transformExtent } from "ol/proj";
import GeoTIFF from "ol/source/GeoTIFF";
import OSMSource from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";

import { routeURL } from "@nextgisweb/pyramid/api";

import "ol/ol.css";

const createGeoJsonLayer = (resource) => {
    const url = routeURL("feature_layer.geojson", `${resource}`);
    const layer = new VectorLayer({
        source: new VectorSource({ url: url, format: new GeoJSON() }),
    });
    return layer;
};

const createGeoTIFFLayer = (resource) => {
    const url = routeURL("raster_layer.cog", `${resource}`);
    const layer = new WebGLTileLayer({
        source: new GeoTIFF({ sources: [{ url: url }] }),
    });
    return layer;
};

const createXYZLayer = (resource) => {
    const url =
        routeURL("render.tile") +
        `?resource=${resource}&x={x}&y={y}&z={z}&nd=204`;
    const layer = new Tile({
        source: new XYZ({ wrapX: false, url: url }),
    });
    return layer;
};

export default ({ target, resource, source_type, extent }) => {
    const map = new Map({
        target: target,
        layers: [new Tile({ source: new OSMSource() })],
        view: new View({
            center: fromLonLat([0, 0]),
            zoom: 3,
            constrainResolution: true,
        }),
    });

    map.addLayer(
        source_type === "geojson"
            ? createGeoJsonLayer(resource)
            : source_type === "geotiff"
            ? createGeoTIFFLayer(resource)
            : createXYZLayer(resource)
    );

    if (extent) {
        const view = map.getView();
        const dst_srs = view.getProjection();
        const src_srs = "EPSG:4326";
        const bbox = [
            extent.minLon,
            extent.minLat,
            extent.maxLon,
            extent.maxLat,
        ];
        view.fitInternal(fromExtent(transformExtent(bbox, src_srs, dst_srs)));
    }
};
