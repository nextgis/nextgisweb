define([
    'dojo/_base/declare', 'dojo/_base/array', 'dojox/dtl', 'dojox/dtl/Context',
    'openlayers/ol', 'openlayers/ol-popup',
    'ngw-pyramid/i18n!webmap', 'ngw-pyramid/hbs-i18n',
    'ngw/openlayers/layer/Vector', 'dojo/text!./AnnotationsPopup.hbs',
], function (
    declare, array, dtl, dtlContext, ol, olPopup,
    i18n, hbsI18n, Vector, template
) {
    var wkt = new ol.format.WKT(),
        popupTemplate = new dtl.Template(hbsI18n(template, i18n));
    
    return declare(null, {
        _layer: null,
        _source: null,
        _annotationsManager: null,
        
        constructor: function (annotationsManager, defaultStyle) {
            this._defaultStyle = defaultStyle;
            this._annotationsManager = annotationsManager;
            this._source = new ol.source.Vector();
            this._layer = new Vector('', {title: 'annotations'});
            this._layer.olLayer.setSource(this._source);
        },
        
        addToMap: function (map) {
            map.addLayer(this._layer);
        },
        
        getSource: function () {
            return this._source;
        },
        
        fillAnnotations: function (annotations) {
            var features = array.map(annotations, this._annotationToFeature, this);
            this._source.addFeatures(features);
        },
        
        _annotationToFeature: function (annotation) {
            var geom, feature, style;
            geom = wkt.readGeometry(annotation.geom);
            style = 'style' in annotation && annotation.style ?
                this._annotationsManager.jsonStyleToOlStyle(annotation.style) :
                this._defaultStyle;
            
            return new ol.Feature({
                geometry: geom,
                id: annotation.id,
                style: style
            });
        }
    });
});
