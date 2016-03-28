/*global define*/
define([
    "dojo/_base/declare",
    "dojo/Stateful",
    "openlayers/ol"
], function (
    declare,
    Stateful,
    ol
) {
    return declare(Stateful, {
        DPI: 1000 / 39.37 / 0.28,

        IPM: 39.37,

        constructor: function (options) {
            this.olMap = new ol.Map(options);

            this.layers = {};
            var widget = this,
                olMap = this.olMap,
                olView = this.olMap.getView();

            olView.on("change:resolution", function (evt) {
                widget.set("resolution", olView.getResolution());
            });

            olView.on("change:center", function (evt) {
                widget.set("center", olView.getCenter());
            });
        },

        addLayer: function (layer) {
            this.layers[layer.name] = layer;
            this.olMap.addLayer(layer.olLayer);
        },

        removeLayer: function (layer) {
            this.olMap.removeLayer(layer.olLayer);
            delete this.layers[layer.name];
        },

        getScaleForResolution: function(res, mpu) {
            return parseFloat(res) * (mpu * this.IPM * this.DPI);
        },

        getResolutionForScale: function(scale, mpu) {
            return parseFloat(scale) / (mpu * this.IPM * this.DPI);
        }
    });
});
