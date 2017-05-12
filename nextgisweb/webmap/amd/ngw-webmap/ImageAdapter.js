/* global define */
define([
    "dojo/_base/declare",
    "dojo/io-query",
    "./Adapter",
    "ngw/route",
    "ngw/openlayers/layer/Image"
], function (declare, ioQuery, Adapter, route, Image) {
    return declare(Adapter, {
        createLayer: function (item) {
            var layer = new Image(item.id, {
                maxResolution: item.maxResolution ? item.maxResolution : undefined,
                minResolution: item.minResolution ? item.minResolution : undefined,
                visible: item.visibility,
                opacity: item.transparency ? (1 - item.transparency / 100) : 1.0
            }, {
                url: route.render.image(),
                params: {
                    resource: item.styleId
                },
                ratio: 1,
                imageLoadFunction: function(image, src) {
                    var url = src.split("?")[0];
                    var query = src.split("?")[1];
                    var queryObject = ioQuery.queryToObject(query);
                    image.getImage().src = url
                        + "?resource=" + queryObject["resource"]
                        + "&extent=" + queryObject["BBOX"]
                        + "&size=" + queryObject["WIDTH"] + "," + queryObject["HEIGHT"]
                        + "#" + Date.now(); // in-memory cache busting
                }
            });

            return layer;
        }
    });
});
