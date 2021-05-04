define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/json",
    "dojox/html/entities",
    "dojox/dtl",
    "dojox/dtl/Context",
    "openlayers/ol",
    "@nextgisweb/pyramid/i18n!",
    "ngw-webmap/layers/annotations/AnnotationsPopup",
], function (
    declare,
    array,
    json,
    htmlEntities,
    dtl,
    dtlContext,
    ol,
    i18n,
    AnnotationsPopup
) {
    var wkt = new ol.format.WKT(),
        defaultDescription = i18n.gettext("Your annotation text"),
        defaultStyle = {
            circle: {
                radius: 5,
                stroke: { color: "#d27a00", width: 1 },
                fill: { color: "#FF9800" },
            },
        };

    return declare(null, {
        _feature: null,
        _editable: null,

        constructor: function (options) {
            this._editable = options.editable;
            if ("annotationInfo" in options)
                this._buildFromAnnotationInfo(options.annotationInfo);
            if ("feature" in options) this._buildFromFeature(options.feature);
        },

        _buildFromAnnotationInfo: function (annotationInfo) {
            var popup = new AnnotationsPopup(this, this._editable),
                geom,
                feature,
                style;

            geom = wkt.readGeometry(annotationInfo.geom);
            feature = new ol.Feature({
                geometry: geom,
            });

            feature.setId(annotationInfo.id);

            style = this._buildStyle(annotationInfo);
            feature.setStyle(style);

            feature.setProperties({
                info: annotationInfo,
                popup: popup,
                annFeature: this,
            });

            this._feature = feature;
        },

        _buildFromFeature: function (feature) {
            feature.setProperties({
                info: {
                    description: defaultDescription,
                    style: defaultStyle,
                    geom: wkt.writeGeometry(feature.getGeometry()),
                },
                popup: new AnnotationsPopup(this),
                annFeature: this,
            });

            this._feature = feature;
        },

        clearOlFeature: function () {
            delete this._feature;
        },

        isNew: function () {
            return typeof this._feature.getId() === "undefined";
        },

        getId: function () {
            return this._feature.getId();
        },

        setId: function (id) {
            this._feature.setId(id);
        },

        getAnnotationInfo: function () {
            return this._feature.get("info");
        },

        getPopup: function () {
            return this._feature.get("popup");
        },

        getDescriptionAsHtml: function () {
            var description = this._feature.get("info")["description"];
            if (!description) return "";
            return htmlEntities.decode(description);
        },

        getFeature: function () {
            return this._feature;
        },

        updateGeometry: function (geometry) {
            var annotationInfo = this._feature.get("info");
            annotationInfo.geom = wkt.writeGeometry(geometry);
            this._feature.setGeometry(geometry);
        },

        updateAnnotationInfo: function (annotationInfo) {
            var style = this._buildStyle(annotationInfo);
            this._feature.setStyle(style);

            this._feature.setProperties({
                info: annotationInfo,
            });
        },

        updatePopup: function () {
            var popup = this._feature.get("popup");
            popup.update();
        },

        _buildStyle: function (annotationInfo) {
            return "style" in annotationInfo && annotationInfo.style
                ? this.jsonStyleToOlStyle(annotationInfo.style)
                : new ol.style.Style(defaultStyle);
        },

        jsonStyleToOlStyle: function (jsonStyle) {
            if (!jsonStyle) return new ol.style.Style();

            if (typeof jsonStyle === "string" || jsonStyle instanceof String) {
                jsonStyle = json.parse(jsonStyle);
            }
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: jsonStyle.circle.radius,
                    fill: new ol.style.Fill(jsonStyle.circle.fill),
                    stroke: new ol.style.Stroke(jsonStyle.circle.stroke),
                }),
            });
        },
    });
});
