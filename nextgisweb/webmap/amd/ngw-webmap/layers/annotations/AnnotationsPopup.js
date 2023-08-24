define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/topic",
    "dojo/html",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "openlayers/ol",
    "../../ol-ext/ol-popup",
    "ngw-webmap/layers/annotations/AnnotationFeature",
    "@nextgisweb/pyramid/i18n!",
    "ngw-webmap/ol/layer/Vector",
    "dojo/text!./AnnotationsPopup.hbs",
    "xstyle/css!./AnnotationsPopup.css",
], function (
    declare,
    lang,
    on,
    topic,
    html,
    domClass,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    ol,
    olPopup,
    AnnotationFeature,
    i18n,
    Vector,
    template
) {
    const contentTemplate = i18n.renderTemplate(template);

    return declare(null, {
        _popup: null,
        _annFeature: null,
        _contentWidget: null,
        _editable: null,

        constructor: function (annotationFeature, editable, annotationInfo) {
            this._editable = editable;
            this._annFeature = annotationFeature;

            const customCssClass = annotationInfo
                ? `annotation ${this._getAccessCssClass(annotationFeature)}`
                : "annotation";

            this._popup = new olPopup({
                insertFirst: false,
                autoPan: false,
                customCssClass,
            });

            if (annotationInfo) this._setTitle(annotationFeature);

            this._popup.annFeature = annotationFeature;
            this._popup.cloneOlPopup = this.cloneOlPopup;
            this._popup.annPopup = this;
        },

        _getAccessCssClass: function (annFeature) {
            return annFeature.getAccessType();
        },

        _setAccessCssClass: function (annFeature) {
            if (!this._popup) return;

            const elPopup = this._popup.element.childNodes[0];
            const cssClass = this._getAccessCssClass(annFeature);
            domClass.add(elPopup, cssClass);
        },

        _setTitle: function (annotationFeature) {
            const accessTypeTitle = annotationFeature.getAccessTypeTitle();
            this._popup.element.setAttribute("title", accessTypeTitle);
        },

        addToMap: function (map) {
            if (this._map) return this;

            this._map = map;
            this._map.olMap.addOverlay(this._popup);
            domClass.add(this._popup.element, "annotation-layer");
            return this;
        },

        getAnnFeature: function () {
            return this._annFeature;
        },

        cloneOlPopup: function (annFeature) {
            const popup = new olPopup({
                insertFirst: false,
                autoPan: false,
                customCssClass: "annotation no-edit",
            });

            const coordinates = this._getPopupCoordinates(annFeature);
            popup.show(coordinates, "");

            var contentWidget = new (declare(
                [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
                {
                    templateString: contentTemplate,
                }
            ))();
            contentWidget.placeAt(popup.content);

            html.set(
                contentWidget.descriptionDiv,
                annFeature.getDescriptionAsHtml()
            );

            return popup;
        },

        remove: function () {
            if (!this._map) return false;

            this._map.olMap.removeOverlay(this._popup);
            this._map = null;
            this._contentWidget = null;
            return true;
        },

        show: function () {
            const coordinates = this._getPopupCoordinates(this._annFeature);
            this._popup.show(coordinates, "");

            this._contentWidget = new (declare(
                [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin],
                {
                    templateString: contentTemplate,
                }
            ))();
            this._contentWidget.placeAt(this._popup.content);

            this._setEditableState();

            html.set(
                this._contentWidget.descriptionDiv,
                this._annFeature.getDescriptionAsHtml()
            );
        },

        _getPopupCoordinates: function (annFeature) {
            const geometry = annFeature.getFeature().getGeometry();
            const geometryType = geometry.getType();
            switch (geometryType) {
                case "Point":
                    return geometry.getCoordinates();
                case "LineString":
                    return geometry.getFlatMidpoint();
                case "Polygon":
                    return geometry.getInteriorPoint().getCoordinates();
                default:
                    throw Error(`Unknown geometry type: ${geometryType}`);
            }
        },

        _setEditableState: function () {
            on(
                this._contentWidget.spanEditAnnotation,
                "click",
                lang.hitch(this, this._onEditAnnotation)
            );
        },

        _onEditAnnotation: function () {
            topic.publish("webmap/annotations/change/", this._annFeature);
        },

        update: function () {
            const feature = this._annFeature.getFeature();
            const accessType = this._annFeature.getAccessType();

            if (feature && accessType) {
                this._setTitle(this._annFeature);
                this._setAccessCssClass(this._annFeature);
            }

            if (!this._contentWidget) return false;
            html.set(
                this._contentWidget.descriptionDiv,
                this._annFeature.getDescriptionAsHtml()
            );
        },
    });
});
