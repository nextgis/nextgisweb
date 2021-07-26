/** @entrypoint */
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Tile from "ol/layer/Tile";
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from "ol/layer/VectorTile";
import OSMSource from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { fromLonLat } from "ol/proj";
import { createXYZ } from "ol/tilegrid";

import { routeURL } from "@nextgisweb/pyramid/api";

export default ({ target, resource, source_type }) => {
    const map = new Map({
        target: target,
        layers: [new Tile({ source: new OSMSource() })],
        view: new View({ center: fromLonLat([0, 0]), zoom: 3, constrainResolution: true }),
    });

    map.addLayer(source_type == "mvt" ? createMVTLayer(resource) : createXYZLayer(resource));
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

const createXYZLayer = (resource) => {
    const url =
        routeURL("render.tile") +
        `?resource=${resource}&x={x}&y={y}&z={z}`;
    const layer = new TileLayer({
        source: new XYZ({
            wrapX: false,
            url: url,
        }),
    });
    return layer;
}
