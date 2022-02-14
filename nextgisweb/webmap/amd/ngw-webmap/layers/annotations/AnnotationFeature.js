define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/json",
    "dojo/dom-class",
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
    domClass,
    htmlEntities,
    dtl,
    dtlContext,
    ol,
    i18n,
    AnnotationsPopup
) {
    const wkt = new ol.format.WKT();
    const defaultDescription = i18n.gettext("Your annotation text");
    const defaultStyle = {
        circle: {
            radius: 5,
            stroke: { color: "#d27a00", width: 1 },
            fill: { color: "#FF9800" },
        },
    };
    const hideStyle = new ol.style.Style(null);

    return declare(null, {
        _feature: null,
        _editable: null,
        _accessType: null,
        _style: null,
        _visible: true,
        _popupVisible: null,

        constructor: function (options) {
            this._editable = options.editable;
            if ("annotationInfo" in options)
                this._buildFromAnnotationInfo(options.annotationInfo);
            if ("feature" in options) this._buildFromFeature(options.feature);
        },

        _buildFromAnnotationInfo: function (annotationInfo) {
            const geom = wkt.readGeometry(annotationInfo.geom);
            const feature = new ol.Feature({
                geometry: geom,
            });

            feature.setId(annotationInfo.id);

            this._style = this._buildStyle(annotationInfo);
            feature.setStyle(this._style);

            feature.setProperties({
                info: annotationInfo,
                annFeature: this,
            });

            this._feature = feature;
            this.calculateAccessType();

            const popup = new AnnotationsPopup(
                this,
                this._editable,
                annotationInfo
            );
            feature.setProperties({
                popup: popup,
            });
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
            const feature = this.getFeature();
            if (!feature) return null;
            return feature.get("info");
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

        getAccessType: function () {
            return this._accessType;
        },

        getAccessTypeTitle: function () {
            const annotationInfo = this.getAnnotationInfo();
            if (!annotationInfo) return null;

            const accessType = this.getAccessType();
            if (!accessType) return null;

            let title;
            if (accessType === "public") {
                title = i18n.gettext("Public annotation");
            } else if (accessType === "own") {
                title = i18n.gettext("My private annotation");
            } else {
                title =
                    i18n.gettext(`Private annotation`) +
                    ` (${annotationInfo.user})`;
            }
            return title;
        },

        updateGeometry: function (geometry) {
            const annotationInfo = this._feature.get("info");
            annotationInfo.geom = wkt.writeGeometry(geometry);
            this._feature.setGeometry(geometry);
        },

        updateAnnotationInfo: function (annotationInfo) {
            this.setId(annotationInfo.id);
            this._style = this._buildStyle(annotationInfo);
            this._feature.setStyle(this._style);

            this._feature.setProperties({
                info: annotationInfo,
            });

            this.calculateAccessType();
            this.updatePopup();
        },

        updatePopup: function () {
            const popup = this._feature.get("popup");
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

        calculateAccessType: function () {
            const props = this._feature.getProperties();
            if (!props["info"]) {
                this._accessType = null;
                return;
            }

            const { info } = props;

            let accessType;
            if (info.public) {
                accessType = "public";
            } else if (info.own) {
                accessType = "own";
            } else {
                accessType = "private";
            }

            this._accessType = accessType;
        },

        toggleVisible: function (visible) {
            if ((visible && this._visible) || (!visible && !this._visible))
                return false;
            this.getFeature().setStyle(visible ? this._style : hideStyle);
            this._visible = visible;
        },

        togglePopup: function (visible, map) {
            if (
                (visible && this._popupVisible) ||
                (!visible && !this._popupVisible)
            )
                return false;

            const popup = this.getPopup();
            if (visible) {
                popup.addToMap(map).show();
            } else {
                popup.remove();
            }
            this._popupVisible = visible;
        },
    });
});
