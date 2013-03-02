/*global define, ngwConfig*/
define([
    "dojo/_base/declare",
    "webmap/Adapter",
    "ngw/openlayers/layer/OSM"
], function (declare, Adapter, OSM) {
    return declare(Adapter, {
        createLayer: function (item) {
            return new OSM(item.id, {
                url: ngwConfig.applicationUrl + "/style/" + item.styleId + '/tms?z=${z}&x=${x}&y=${y}',
                isBaseLayer: false,
                type: "png",
                visibility: item.visibility,
                minScale: item.minScaleDenom ? (1 / item.minScaleDenom) : undefined,
                maxScale: item.maxScaleDenom ? (1 / item.maxScaleDenom) : undefined
            });
        }
    });
});