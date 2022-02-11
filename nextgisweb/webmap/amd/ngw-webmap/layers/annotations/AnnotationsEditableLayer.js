define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/topic",
    "@nextgisweb/pyramid/i18n!",
    "openlayers/ol",
    "ngw-webmap/ol/layer/Vector",
], function (
    declare,
    lang,
    array,
    topic,
    i18n,
    ol,
    Vector
) {
    return declare(null, {
        _map: null,
        _editableLayer: null,
        _source: null,

        constructor: function (map) {
            this._map = map;
        },

        activate: function (annotationsLayer) {
            this._annotationsLayer = annotationsLayer;
            this._editableLayer = new Vector("", { title: "editor.overlay" });
            this._source = annotationsLayer.getSource();
            this._editableLayer.olLayer.setSource(this._source);
            this._map.addLayer(this._editableLayer);
            this._setInteractions();
        },

        deactivate: function () {
            this._offInteractions();
            this._map.removeLayer(this._editableLayer);
            this._editableLayer = null;
            this._source = null;
        },

        _setInteractions: function () {
            this._draw = new ol.interaction.Draw({
                source: this._source,
                type: "Point",
                freehandCondition: function (event) {
                    return ol.events.condition.never(event);
                },
            });

            this._draw.on(
                "drawend",
                lang.hitch(this, function (e) {
                    topic.publish(
                        "webmap/annotations/layer/feature/created",
                        e.feature
                    );
                })
            );

            this._map.olMap.addInteraction(this._draw);
            this._draw.setActive(true);
        },

        _offInteractions: function () {
            this._map.olMap.removeInteraction(this._draw);
            this._draw = null;
        },
    });
});
