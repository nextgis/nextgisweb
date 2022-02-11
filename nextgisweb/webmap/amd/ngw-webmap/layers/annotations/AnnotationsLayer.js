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
    return declare(null, {
        _layer: null,
        _source: null,
        _map: null,
        _popupsVisible: null,

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

            this.applyFilter();
        },

        getLayer: function () {
            return this._layer;
        },

        showPopups: function () {
            this._popupsVisible = true;
            this.applyFilter(this._filter);
        },

        showPopup: function (annotationFeature) {
            annotationFeature.togglePopup(true, this._map);
        },

        hidePopups: function () {
            array.forEach(
                this._source.getFeatures(),
                (f) => f.get("annFeature").togglePopup(false),
                this
            );
            this._popupsVisible = false;
        },

        removeAnnFeature: function (annFeature) {
            const olFeature = annFeature.getFeature();
            olFeature.get("popup").remove();
            this._source.removeFeature(olFeature);
            annFeature.clearOlFeature();
        },

        _filter: null,
        
        getFilter: function () {
            return this._filter;
        },
        
        applyFilter: function (filter) {
            if (filter) this._filter = filter;

            this._source.getFeatures().forEach((f) => {
                const { annFeature } = f.getProperties();
                const accessType = annFeature.getAccessType();
                const visible = this._filter[accessType];
                annFeature.toggleVisible(visible);
                annFeature.togglePopup(
                    this._popupsVisible ? visible : false,
                    this._map
                );
            });
        },
    });
});
