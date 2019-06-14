define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/request/xhr',
    'dojo/json',
    'dojo/store/JsonRest',
    'dojo/store/Memory',
    'dojo/promise/all',
    'dojox/html/entities',
    'openlayers/ol',
    'ngw/route',
    'ngw/utils/make-singleton',
    'ngw-webmap/layers/AnnotationsLayer',
    'ngw-webmap/layers/AnnotationsEditableLayer',
    'ngw-webmap/ui/AnnotationsDialog/AnnotationsDialog'
], function (
    declare, lang, array, topic, xhr, json, JsonRest, Memory, all, htmlEntities, ol, route,
    MakeSingleton, AnnotationsLayer, AnnotationsEditableLayer,
    AnnotationsDialog
) {
    var wkt = new ol.format.WKT(),
        defaultJsonStyle = {
            circle: {
                radius: 5,
                stroke: {color: 'white', width: 1},
                fill: {color: 'red'}
            }
        };
    
    return MakeSingleton(declare('ngw-webmap.AnnotationsManager', [], {
        _store: null,
        _display: null,
        _annotationsLayer: null,
        _editableLayer: null,
        _annotationsDialog: null,
        
        constructor: function (display) {
            if (!display) throw Exception('AnnotationsManager: display is required parameter for first call!');
            this._display = display;
            
            this._display._layersDeferred.then(lang.hitch(this, this._init));
            this._annotationsDialog = new AnnotationsDialog({
                annotationsManager: this
            });
        },
        
        _init: function () {
            this._buildAnnotationsLayers();
            this._loadAnnotations();
            this._bindEvents();
        },
        
        _buildAnnotationsLayers: function () {
            this._annotationsLayer = new AnnotationsLayer(this, this.jsonStyleToOlStyle(defaultJsonStyle));
            this._annotationsLayer.addToMap(this._display.map);
            this._editableLayer = new AnnotationsEditableLayer(this._display.map);
        },
        
        _loadAnnotations: function () {
            this._getAnnotations().then(lang.hitch(this, function (annotations) {
                this._annotationsLayer.fillAnnotations(annotations);
            }));
        },
        
        _bindEvents: function () {
            topic.subscribe('webmap/annotations/add/activate', lang.hitch(this, this._onAddModeActivated));
            topic.subscribe('webmap/annotations/add/deactivate', lang.hitch(this, this._onAddModeDeactivated));
            topic.subscribe('webmap/annotations/layer/', lang.hitch(this, this._onChangeEditableLayer));
            topic.subscribe('webmap/annotations/change/', lang.hitch(this, this._onChangeAnnotation));
        },
        
        _onAddModeActivated: function () {
            this._editableLayer.activate(this._annotationsLayer);
        },
        
        _onAddModeDeactivated: function () {
            this._editableLayer.deactivate();
        },
        
        _onChangeEditableLayer: function (type, feature) {
            if (type === 'create') {
                this._annotationsDialog.showForCreate(feature).then(lang.hitch(this, function (result) {
                    this._createAnnotation(feature).then(function (result) {
                        console.log(result);
                    });
                }));
            }
        },
        
        _createAnnotation: function (feature) {
            var props = feature.getProperties(),
                newAnnotation = {};
            
            newAnnotation.description = htmlEntities.encode(props.description);
            newAnnotation.style = json.stringify(props.style);
            newAnnotation.geom = wkt.writeGeometry(feature.getGeometry());
            
            
            return xhr(route.webmap.annotation.collection({
                id: this._display.config.webmapId
            }), {
                method: 'POST',
                handleAs: 'json',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: json.stringify(newAnnotation)
            });
        },
        
        _getAnnotations: function () {
            return xhr(route.webmap.annotation.collection({
                id: this._display.config.webmapId
            }), {
                method: 'GET',
                handleAs: 'json',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        },
        
        _onChangeAnnotation: function (type, feature) {
            if (type === 'create') {
            
            }
        },
        
        jsonStyleToOlStyle: function (jsonStyle) {
            if (!jsonStyle) return new ol.style.Style();
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: jsonStyle.circle.radius,
                    fill: new ol.style.Fill(jsonStyle.circle.fill),
                    stroke: new ol.style.Stroke(jsonStyle.circle.stroke),
                })
            });
        }
    }));
});
