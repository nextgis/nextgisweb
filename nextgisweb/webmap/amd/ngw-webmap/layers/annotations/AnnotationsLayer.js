define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojox/dtl",
    "dojox/dtl/Context",
    "openlayers/ol",
    "../../ol-ext/ol-popup",
    "ngw-webmap/layers/annotations/AnnotationFeature",
    "ngw-webmap/ol/layer/Vector",
], function (
    declare,
    array,
    domClass,
    dtl,
    dtlContext,
    ol,
    olPopup,
    AnnotationFeature,
    Vector
) {
    var wkt = new ol.format.WKT();

    return declare(null, {
        _layer: null,
        _source: null,
        _map: null,

        constructor: function (editable) {
            this._editable = editable;
            this._source = new ol.source.Vector();
            this._layer = new Vector("", {
                title: "annotations",
            });
            this._layer.set("visibility", false);
            this._layer.olLayer.setSource(this._source);
        },

        addToMap: function (map) {
            this._map = map;
            map.addLayer(this._layer);
        },

        getSource: function () {
            return this._source;
        },

        fillAnnotations: function (annotationsInfo) {
            var editable = this._editable,
                annotationFeatures;

            annotationFeatures = array.map(
                annotationsInfo,
                function (annotationInfo) {
                    return new AnnotationFeature({
                        annotationInfo: annotationInfo,
                        editable: editable,
                    });
                },
                this
            );

            array.forEach(
                annotationFeatures,
                function (annotationFeature) {
                    this._source.addFeature(annotationFeature.getFeature());
                },
                this
            );
        },

        getLayer: function () {
            return this._layer;
        },

        showPopups: function () {
            const olFeatures = this._source.getFeatures();
            array.forEach(
                olFeatures,
                function (olFeature) {
                    this.showPopup(olFeature);
                },
                this
            );
        },

        showPopup: function (annotationFeature) {
            const popup =
                typeof annotationFeature.getPopup === "function"
                    ? annotationFeature.getPopup()
                    : annotationFeature.get("popup");
            popup.addToMap(this._map).show();
            domClass.add(popup._popup.element, "annotation-layer");
        },

        hidePopups: function () {
            var olFeatures = this._source.getFeatures(),
                popup;

            array.forEach(
                olFeatures,
                function (olFeature) {
                    popup = olFeature.get("popup").remove();
                },
                this
            );
        },

        removeAnnFeature: function (annFeature) {
            var olFeature = annFeature.getFeature();
            olFeature.get("popup").remove();
            this._source.removeFeature(olFeature);
            annFeature.clearOlFeature();
        },
    });
});
