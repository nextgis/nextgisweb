/*global define*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/Stateful",
    "dojo/Evented",
    "openlayers/ol"
], function (
    declare,
    lang,
    array,
    Stateful,
    Evented,
    ol
) {
    return declare([Stateful, Evented], {
        DPI: 1000 / 39.37 / 0.28,

        IPM: 39.37,

        // current zoom-level and center
        position: {},

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

        getPosition: function () {
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

        startChangePositionListening: function () {
            var widget = this;
            // save position before it change
            this.olMap.on(
                'movestart', 
                lang.hitch(this, function () {
                    widget._position = widget.getPosition();
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
            var memPosition = widget._position || {};
            var position = widget.getPosition();
            var options = {
                zoom: position.zoom,
                lat: position.lat,
                lon: position.lon
            };
            var events = [
                {
                    detail: 'move',
                    isChange: function () {
                        return position.lat !== memPosition.lat ||
                            position.lon !== memPosition.lon;
                    }
                },
                {
                    detail: 'zoom',
                    isChange: function () {
                        return position.zoom !== memPosition.zoom;
                    }
                }
            ];
            array.forEach(events, function (event) {
                if (event.isChange()) {
                    widget.emit(event.detail, options);
                }
            });
            widget._position = position;
        }
    });
});
