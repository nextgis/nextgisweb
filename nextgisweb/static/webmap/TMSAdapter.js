define([
    "dojo/_base/declare",
    "webmap/Adapter"
], function (declare, Adapter) {
    return declare("webmap.TMSAdapter", [Adapter], {

        constructor: function (options) {
            this.olLayer = new OpenLayers.Layer.OSM(
                arguments.id,
                application_url + "/style/" + options.layer_style_id +  '/tms?z=${z}&x=${x}&y=${y}',
                { isBaseLayer: false, type: 'png', visibility: options.layer_enabled }
            );
        }

    });
})