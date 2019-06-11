define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/store/JsonRest',
    'dojo/store/Memory',
    'ngw/route',
    'ngw/utils/make-singleton',
    'ngw-webmap/layers/AnnotationsLayer',
    'ngw-webmap/layers/AnnotationsEditableLayer',
    'ngw-webmap/ui/AnnotationsDialog/AnnotationsDialog',
    'ngw-webmap/tool/annotations/AddAnnotation',
], function (
    declare, lang, array, topic, JsonRest, Memory, route,
    MakeSingleton, AnnotationsLayer, AnnotationsEditableLayer,
    AnnotationsDialog, AddAnnotationTool
) {
    var annotationsDialog = new AnnotationsDialog(),
        ADD_ANNOTATION_STATE_KEY = 'addAnnotation';
    
    return MakeSingleton(declare('ngw-webmap.AnnotationsManager', [], {
        _store: null,
        _display: null,
        _annotationsLayer: null,
        _editableLayer: null,
        
        constructor: function (display) {
            if (!display) throw Exception('AnnotationsManager: display is required parameter for first call!');
            this._display = display;
            
            this._display._layersDeferred.then(lang.hitch(this, this._init));
        },
        
        _init: function () {
            this._buildAnnotationsLayer();
            this._editableLayer = new AnnotationsEditableLayer(this._display.map);
            this._loadAnnotations();
            this._bindEvents();
        },
        
        _buildAnnotationsLayer: function () {
            this._annotationsLayer = new AnnotationsLayer();
            this._annotationsLayer.addToMap(this._display.map);
        },
        
        _loadAnnotations: function () {
            var store = new JsonRest({
                target: route.webmap.annotation.collection({
                    id: this._display.config.webmapId
                })
            });
            
            store.query().then(lang.hitch(this, this._fillAnnotations));
        },
        
        _fillAnnotations: function (annotations) {
            this._store = new Memory({
                data: annotations
            });
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
                annotationsDialog.showForCreate();
            }
        },
        
        _onChangeAnnotation: function (type, feature) {
            if (type === 'create') {
            
            }
        }
        
        
    }));
});
