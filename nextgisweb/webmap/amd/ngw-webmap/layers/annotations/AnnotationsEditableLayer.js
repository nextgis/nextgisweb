define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/topic",
    "@nextgisweb/pyramid/i18n!",
    "openlayers/ol",
    "ngw/openlayers/layer/Vector",
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

            this._snap = new ol.interaction.Snap({
                source: this._source,
            });

            this._map.olMap.addInteraction(this._draw);
            this._map.olMap.addInteraction(this._snap);

            this._draw.setActive(true);
            this._snap.setActive(true);
        },

        _previousGeometry: null,
        _bindModifyEvents: function () {
            this._modify.on("modifystart", function (e) {
                var feature = e.features.getArray()[0];
                this._previousGeometry = feature.getGeometry().clone();
            });

            this._modify.on("modifyend", function (e) {
                var feature = e.features.getArray()[0],
                    annFeature = feature.get("annFeature");
                annFeature.updateGeometry(feature.getGeometry());
                topic.publish(
                    "webmap/annotations/geometry/changed",
                    annFeature,
                    this._previousGeometry
                );
            });
        },

        _offInteractions: function () {
            this._map.olMap.removeInteraction(this._draw);
            this._map.olMap.removeInteraction(this._snap);

            this._draw = null;
            this._snap = null;
        },
    });
});
