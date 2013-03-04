/*global define*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Stateful",
    "dojo/dom",
    "../openlayers"
], function (
    declare,
    lang,
    Stateful,
    dom,
    openlayers
) {
    return declare(Stateful, {
        srs: 3857,

        constructor: function (div, options) {
            this.olMap = new openlayers.Map(div, {
                projection: 'EPSG:' + this.srs
            });

            this.layers = {};
            var widget = this, olMap = this.olMap;

            this.olMap.events.on({
                zoomend: function (evt) {
                    widget.set("scaleDenom", olMap.getScale());
                }
            });

        },

        addLayer: function (layer) {
            this.layers[layer.name] = layer;
            this.olMap.addLayer(layer.olLayer);
        }
    });
});