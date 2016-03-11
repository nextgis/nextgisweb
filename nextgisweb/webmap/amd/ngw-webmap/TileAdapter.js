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
                visible: item.visibility,
                maxResolution: item.maxResolution ? item.maxResolution : undefined,
                minResolution: item.minResolution ? item.minResolution : undefined,
                opacity: item.transparency ? (1 - item.transparency / 100) : 1.0
            }, {
                url: route.render.tile() + "?z={z}&x={x}&y={y}" + "&resource=" + item.styleId
            });
        }
    });
});
