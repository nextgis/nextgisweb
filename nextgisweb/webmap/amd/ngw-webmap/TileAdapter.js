define([
    "dojo/_base/declare",
    "./Adapter",
    "@nextgisweb/pyramid/api",
    "ngw-webmap/ol/layer/XYZ"
], function (
    declare,
    Adapter,
    api,
    XYZ
) {
    return declare(Adapter, {
        createLayer: function (item) {
            return new XYZ(item.id, {
                visible: item.visibility,
                maxResolution: item.maxResolution ? item.maxResolution : undefined,
                minResolution: item.minResolution ? item.minResolution : undefined,
                opacity: item.transparency ? (1 - item.transparency / 100) : 1.0
            }, {
                url: api.routeURL('render.tile') + "?z={z}&x={x}&y={y}" + "&resource=" + item.styleId + "&nd=204",
                crossOrigin: 'anonymous'
            });
        }
    });
});
