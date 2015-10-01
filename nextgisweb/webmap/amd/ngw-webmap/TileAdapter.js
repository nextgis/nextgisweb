/* global define */
define([
    "dojo/_base/declare",
    "./Adapter",
    "ngw/route",
    "ngw/openlayers/layer/XYZ"
], function (declare, Adapter, route, XYZ) {
    return declare(Adapter, {
        createLayer: function (item) {
            return new XYZ(item.id, {
                url: route.render.tile() + "?z=${z}&x=${x}&y=${y}" + "&resource=" + item.styleId,
                isBaseLayer: false,
                type: "png",
                visibility: item.visibility,
                minScale: item.minScaleDenom ? (1 / item.minScaleDenom) : undefined,
                maxScale: item.maxScaleDenom ? (1 / item.maxScaleDenom) : undefined,
                opacity: item.transparency ? (1 - item.transparency / 100) : 1.0
            });
        }
    });
});
