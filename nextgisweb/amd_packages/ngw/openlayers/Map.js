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
                projection: 'EPSG:' + this.srs,
                controls: options.controls
            });

            this.layers = {};
            var widget = this, olMap = this.olMap;

            // Z-index для попапа
            openlayers.Map.prototype.Z_INDEX_BASE.Popup = 10000;

            this.olMap.events.on({
                zoomend: function (evt) {
                    widget.set("scaleDenom", olMap.getScale());
                },
                moveend: function (evt) {
                    widget.set("center", olMap.getCenter());
                },
                changebaselayer: function (evt) {
                    // Костыль для Bing (см. #315)
                    var overlays = olMap.getLayersBy('isBaseLayer', false);
                    if (evt.layer.CLASS_NAME === 'OpenLayers.Layer.Bing') {
                        overlays.forEach(function (l) { l.zoomOffset = 1; });
                    } else {
                        overlays.forEach(function (l) { l.zoomOffset = 0; });
                    }
                }
            });

        },

        addLayer: function (layer) {
            this.layers[layer.name] = layer;
            this.olMap.addLayer(layer.olLayer);
        }
    });
});