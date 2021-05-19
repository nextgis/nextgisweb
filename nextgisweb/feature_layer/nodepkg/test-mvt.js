/** @entrypoint */
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import Tile from "ol/layer/Tile";
import VectorTileLayer from "ol/layer/VectorTile";
import OSMSource from "ol/source/OSM";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { fromLonLat } from "ol/proj";
import { createXYZ } from "ol/tilegrid";

import { routeURL } from "@nextgisweb/pyramid/api";

export default ({ target, resource, tileExtent = 4096 }) => {
    const map = new Map({
        target: target,
        layers: [new Tile({ source: new OSMSource() })],
        view: new View({ center: fromLonLat([0, 0]), zoom: 3 }),
    });

    const url =
        routeURL("feature_layer.mvt") +
        `?resource=${resource}&x={x}&y={y}&z={z}`;
    const layer = new VectorTileLayer({
        source: new VectorTileSource({
            format: new MVT(),
            tileGrid: createXYZ({ maxZoom: 22 }),
            tilePixelRatio: tileExtent / 256,
            wrapX: false,
            url: url,
        }),
    });

    map.addLayer(layer);
};
