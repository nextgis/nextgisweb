define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/array', 'dojo/on', 'dojo/topic', 'dojo/html', 'dojo/dom-construct',
    'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
    'openlayers/ol', 'openlayers/ol-popup', 'ngw-webmap/layers/annotations/AnnotationFeature',
    '@nextgisweb/pyramid/i18n!',
    'ngw/openlayers/layer/Vector', 'dojo/text!./AnnotationsPopup.hbs',
    'xstyle/css!./AnnotationsPopup.css'
], function (
    declare, lang, array, on, topic, html, domConstruct, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    ol, olPopup, AnnotationFeature, i18n, Vector, template
) {
    var contentTemplate = i18n.renderTemplate(template);
    
    return declare(null, {
        _popup: null,
        _annFeature: null,
        _contentWidget: null,
        _editable: null,
        
        constructor: function (annotationFeature, editable) {
            this._editable = editable;
            this._annFeature = annotationFeature;
            this._popup = new olPopup({
                insertFirst: false,
                autoPan: false,
                customCssClass: 'annotation'
            });
            this._popup.annFeature = annotationFeature;
            this._popup.cloneOlPopup = this.cloneOlPopup;
        },
        
        addToMap: function (map) {
            if (this._map) return this;
            
            this._map = map;
            this._map.olMap.addOverlay(this._popup);
            return this;
        },
        
        cloneOlPopup: function (annFeature) {
            var popup = new olPopup({
                insertFirst: false,
                autoPan: false,
                customCssClass: 'annotation no-edit'
            });
            
            var coordinates = annFeature.getFeature().getGeometry().getCoordinates();
            
            var contentWidget = new (declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: contentTemplate
            }));
            
            popup.show(coordinates, '');
            contentWidget.placeAt(popup.content);
            html.set(contentWidget.descriptionDiv, annFeature.getDescriptionAsHtml());
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
            var coordinates = this._annFeature.getFeature().getGeometry().getCoordinates();
            
            this._contentWidget = new (declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: contentTemplate
            }));
            
            this._popup.show(coordinates, '');
            this._contentWidget.placeAt(this._popup.content);
            this._setEditableState();
            html.set(this._contentWidget.descriptionDiv, this._annFeature.getDescriptionAsHtml());
        },
        
        _setEditableState: function () {
            on(this._contentWidget.spanEditAnnotation, 'click', lang.hitch(this, this._onEditAnnotation));
        },
        
        _onEditAnnotation: function () {
            topic.publish('webmap/annotations/change/', this._annFeature);
        },
        
        update: function () {
            if (!this._contentWidget) return false;
            html.set(this._contentWidget.descriptionDiv, this._annFeature.getDescriptionAsHtml());
        }
    });
});
