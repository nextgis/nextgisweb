/** @entrypoint */
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Tile from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from "ol/layer/VectorTile";
import OSMSource from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorTileSource from "ol/source/VectorTile";
import VectorSource from "ol/source/Vector";
import MVT from "ol/format/MVT";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { createXYZ } from "ol/tilegrid";
import {transformExtent} from "ol/proj";
import {fromExtent} from "ol/geom/Polygon";

import { routeURL } from "@nextgisweb/pyramid/api";

export default ({ target, resource, source_type, extent }) => {
    const map = new Map({
        target: target,
        layers: [new Tile({ source: new OSMSource() })],
        view: new View({ center: fromLonLat([0, 0]), zoom: 3, constrainResolution: true }),
    });

    map.addLayer(source_type == "geojson" ? createGeoJsonLayer(resource) : createXYZLayer(resource));

    if (extent) {
        const view = map.getView();
        const dst_srs = view.getProjection();
        const src_srs = "EPSG:4326";
        const bbox = [extent.minLon, extent.minLat, extent.maxLon, extent.maxLat];
        view.fitInternal(fromExtent(transformExtent(bbox, src_srs, dst_srs)));
    }
};

const createMVTLayer = (resource) => {
    const url =
        routeURL("feature_layer.mvt") +
        `?resource=${resource}&x={x}&y={y}&z={z}`;
    const layer = new VectorTileLayer({
        source: new VectorTileSource({
            format: new MVT(),
            tileGrid: createXYZ({ maxZoom: 22 }),
            tilePixelRatio: 4096 / 256,
            wrapX: false,
            url: url,
        }),
    });
    return layer;
};

const createGeoJsonLayer = (resource) => {
    const url = routeURL("feature_layer.geojson", `${resource}`);
    const layer = new VectorLayer({
        source: new VectorSource({
            url: url,
            format: new GeoJSON(),
        })
    });
    return layer;
};

const createXYZLayer = (resource) => {
    const url =
        routeURL("render.tile") +
        `?resource=${resource}&x={x}&y={y}&z={z}&nd=204`;
    const layer = new TileLayer({
        source: new XYZ({
            wrapX: false,
            url: url,
        }),
    });
    return layer;
};
