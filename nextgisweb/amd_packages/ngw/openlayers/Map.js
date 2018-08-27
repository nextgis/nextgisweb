/*global define*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Stateful",
    "openlayers/ol"
], function (
    declare,
    lang,
    array,
    Stateful,
    ol
) {
    return declare([Stateful], {
        DPI: 1000 / 39.37 / 0.28,

        IPM: 39.37,

        // zoom lat and lon, used to compare between movestart and moveend positions
        _position: {},

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
        },

        startChangePositionListening: function () {
            var widget = this;
            // save position before it change
            this.olMap.on(
                'movestart', 
                lang.hitch(this, function () {
                    widget._position = widget._getPosition();
                })
            );

            this.olMap.on(
                'moveend', 
                lang.hitch(this, function () {
                    widget._sendPositionChangeEvents();
                })
            );
            // emit initial event
            widget._sendPositionChangeEvents();
        },

        _sendPositionChangeEvents: function () {
            var widget = this;
            var memPosition = widget._position;
            var position = widget._getPosition();
            var events = [
                {params: ['lat', 'lon'], name: 'move'},
                {params: ['zoom'], name: 'zoom'},
            ];
            array.forEach(events, function (event) {
                var isTimeToEmit = array.some(event.params, function (p) {
                    var changed = memPosition[p] !== position[p];
                    if (changed) {
                        widget._position[p] = position[p];
                    }
                    return changed;
                })
                if (isTimeToEmit) {
                    widget.set(event.name, position);
                }
            });
            widget.set('position', position);
        },

        _getPosition: function () {
            var view = this.olMap.getView();
            var center = ol.proj.toLonLat(
                view.getCenter(),
                view.getProjection().getCode()
            );
            return {
                zoom: view.getZoom(),
                lat: center[1],
                lon: center[0]
            };
        },
    });
});
