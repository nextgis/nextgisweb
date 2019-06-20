define([
    'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/array',
    'dojo/on', 'dojo/dom-construct', 'dojo/topic',
    'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dijit/layout/BorderContainer',
    'ngw-pyramid/i18n!webmap', 'ngw-pyramid/hbs-i18n', 'ngw-pyramid/dynamic-panel/DynamicPanel',
    'ngw-webmap/ui/AnnotationsManager/AnnotationsManager', 'ngw-webmap/tool/annotations/AddAnnotation',
    'ngw-webmap/MapStatesObserver', 'dojo/text!./AnnotationsPanel.hbs',
    // dependencies
    'xstyle/css!./AnnotationsPanel.css', 'dijit/form/ToggleButton', 'dojox/layout/TableContainer',
    'dijit/layout/ContentPane', 'ngw-webmap/controls/ToggleControl'
], function (
    declare, lang, array, on, domConstruct, topic, _TemplatedMixin, _WidgetsInTemplateMixin,
    BorderContainer, i18n, hbsI18n, DynamicPanel, AnnotationsManager, AddAnnotationTool,
    MapStatesObserver, template
) {
    var ADD_ANNOTATION_STATE_KEY = 'addAnnotation';
    
    return declare([DynamicPanel, BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
        _display: null,
        _mapStates: null,
        _enableEdit: false,
        
        constructor: function (options) {
            declare.safeMixin(this, options);
            this._display = options.display;
            
            
            this.contentWidget = new (declare([BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
                templateString: hbsI18n(template, i18n),
                region: 'top',
                gutters: false
            }));
        },
        
        postCreate: function () {
            this.inherited(arguments);
            
            this._setDefaultValues();
            this._bindEvents();
            this._buildAnnotationTool();
            
            AnnotationsManager.getInstance(this.display);
            this._mapStates = MapStatesObserver.getInstance();
        },
        
        _setDefaultValues: function () {
            this.contentWidget.chbAnnotationsShow.set('value',
                this._display.config.annotations.default);
            this.contentWidget.chbAnnotationsShowMessages.set('value', true);
        },
        
        _bindEvents: function () {
            this.contentWidget.chbAnnotationsShow.on('change', lang.hitch(this, function (value) {
                topic.publish('/annotations/visible', value);
                this.contentWidget.chbAnnotationsShowMessages.set('disabled', !value);
                
                if (!value && this._enableEdit && this._mapStates.getActiveState() === ADD_ANNOTATION_STATE_KEY) {
                    this._mapStates.deactivateState(ADD_ANNOTATION_STATE_KEY);
                }
            }));
            
            this.contentWidget.chbAnnotationsShowMessages.on('change', function (value) {
                topic.publish('/annotations/messages/visible', value);
            });
        },
        
        _buildAnnotationTool: function () {
            if (!this._display.config.annotations.scope.write) return false;
            
            var setPlace = lang.hitch(this, function (tglButtonTool) {
                this.contentWidget.tcAnnotations.addChild(tglButtonTool);
            });
            
            this._display.mapToolbar.items.addTool(
                new AddAnnotationTool({}),
                ADD_ANNOTATION_STATE_KEY,
                setPlace
            );
            
            this._enableEdit = true;
        }
    });
});
