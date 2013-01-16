define([
    "dojo/_base/declare",
    "dojo/dom",
    "../openlayers",
    "./layer/OSM",
    "./layer/Google"
], function (
    declare,
    dom,
    openlayers,
    OSM,
    Google
) {
    return declare(null, {
        srs: 3857,

        constructor: function (div, options) {
            this.olMap = new openlayers.Map(div, {
                projection: 'EPSG:' + this.srs
            });

            this.layers = {};

            var lOsmMapnik = new OSM('osm', {
                isBaseLayer: true,
                title: "OpenStreetMap",
                attribution: null
            });
            this.addLayer(lOsmMapnik);

            var lGoogleS = new Google('google-satellite', {
                isBaseLayer: true, 
                title: "Google - Спутник",
                type: "satellite"
            });
            this.addLayer(lGoogleS);

            var lGoogleR = new Google('google-roadmap', {
                isBaseLayer: true,
                title: "Google - Схема",
                type: "roadmap"
            });
            this.addLayer(lGoogleR);

            var lGoogleH = new Google('google-hybrid', {
                isBaseLayer: true,
                title: "Google - Гибрид",
                type: "hybrid"
            });
            this.addLayer(lGoogleH);

            var lGoogleT = new Google('google-terrain', {
                isBaseLayer: true,
                title: "Google - Рельеф",
                type: "terrain"
            });
            this.addLayer(lGoogleT);
            
            this.olMap.zoomToMaxExtent();
        },

        addLayer: function (layer) {
            this.layers[layer.name] = layer;
            this.olMap.addLayer(layer.olLayer);
        }
    });
});