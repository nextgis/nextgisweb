define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-construct",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/topic",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/layout/BorderContainer",
    "dijit/form/CheckBox",
    "dijit/form/Select",
    "dojo/data/ObjectStore",
    "dojo/store/Memory",
    "@nextgisweb/pyramid/i18n!",
    "ngw-pyramid/dynamic-panel/DynamicPanel",
    "ngw-webmap/ui/AnnotationsManager/AnnotationsManager",
    "ngw-webmap/MapStatesObserver",
    "dojo/text!./AnnotationsPanel.hbs",
    // dependencies
    "xstyle/css!./AnnotationsPanel.css",
    "dijit/form/ToggleButton",
    "dojox/layout/TableContainer",
    "dijit/layout/ContentPane",
    "ngw-webmap/controls/ToggleControl",
], function (
    declare,
    lang,
    array,
    on,
    domConstruct,
    domStyle,
    domClass,
    topic,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    BorderContainer,
    CheckBox,
    Select,
    ObjectStore,
    Memory,
    i18n,
    DynamicPanel,
    AnnotationsManager,
    MapStatesObserver,
    template
) {
    var ADD_ANNOTATION_STATE_KEY = "addAnnotation";

    return declare(
        [
            DynamicPanel,
            BorderContainer,
            _TemplatedMixin,
            _WidgetsInTemplateMixin,
        ],
        {
            _display: null,
            _mapStates: null,
            _enableEdit: false,
            _chbEditAnnotations: null,

            constructor: function (options) {
                declare.safeMixin(this, options);
                this._display = options.display;

                this.contentWidget = new (declare(
                    [BorderContainer, _TemplatedMixin, _WidgetsInTemplateMixin],
                    {
                        templateString: i18n.renderTemplate(template),
                        region: "top",
                        gutters: false,
                    }
                ))();
            },

            postCreate: function () {
                this.inherited(arguments);

                this._mapStates = MapStatesObserver.getInstance();

                this._setDefaultValues();
                setTimeout(lang.hitch(this, this._bindEvents), 500);
                this._buildAnnotationEditTool();
                this._buildPrivateAnnotationsSection();

                AnnotationsManager.getInstance({
                    display: this.display,
                    panel: this,
                });
            },

            _setDefaultValues: function () {
                const showAnnLayer = this.annotVisibleState || this._display.config.annotations.default;
                this.contentWidget.selAnnotationsShow.set("value", showAnnLayer);
                this.contentWidget.chbShowAnnTypes.set("value", true);
                this.contentWidget.chbShowPublicAnn.set("value", true);
                this.contentWidget.chbShowOwnPrivateAnn.set("value", true);
            },

            setAnnotationsShow: function (mode) {
                this.contentWidget.selAnnotationsShow.set("value", mode);
            },
            
            getGeometryType: function () {
                return this._selGeometryType ? 
                    this._selGeometryType.get("value") : undefined;
            },
            
            getAnnotVisibleState: function () {
                return this.contentWidget.selAnnotationsShow.get("value");
            },

            _bindEvents: function () {
                const deactivateAnnotationState = lang.hitch(
                    this,
                    function (mode) {
                        if (
                            mode === 'no' &&
                            this._enableEdit &&
                            this._mapStates.getActiveState() ===
                                ADD_ANNOTATION_STATE_KEY
                        ) {
                            if (this._chbEditAnnotations.get("checked"))
                                this._chbEditAnnotations.set("checked", false);
                        }
                    }
                );

                this.contentWidget.selAnnotationsShow.on(
                    "change",
                    lang.hitch(this, function (mode) {
                        topic.publish("/annotations/visible", mode);
                        deactivateAnnotationState(mode);
                    })
                );

                if (this._chbEditAnnotations && this._enableEdit) {
                    this._chbEditAnnotations.on(
                        "change",
                        lang.hitch(this, function (value) {
                            if (value) {
                                this._mapStates.activateState(ADD_ANNOTATION_STATE_KEY);
                                this._selGeometryType.set("disabled", false);
                                topic.publish("webmap/annotations/add/activate");
                            } else {
                                this._mapStates.deactivateState(ADD_ANNOTATION_STATE_KEY);
                                this._selGeometryType.set("disabled", true);
                                topic.publish("webmap/annotations/add/deactivate");
                            }
                        })
                    );

                    this._selGeometryType.on(
                        "change",
                        (value) => {
                            topic.publish("webmap/annotations/change/geometryType", value);
                        }
                    );
                }
            },

            _buildAnnotationEditTool: function () {
                if (!this._display.config.annotations.scope.write) return false;

                this._chbEditAnnotations = new CheckBox({
                    name: "chbAddAnnotations",
                    title: i18n.gettext("Edit annotations"),
                    checked: false,
                });
                this.contentWidget.tcAnnotations.addChild(
                    this._chbEditAnnotations
                );

                this._selGeometryType = new Select({
                    name: "selGeometryType",
                    title: i18n.gettext("Geometry type"),
                    disabled: true,
                    options: [
                        {value: "Point", label: i18n.gettext("Point")},
                        {value: "LineString", label: i18n.gettext("Line")},
                        {value: "Polygon", label: i18n.gettext("Polygon")}
                    ]
                });
                this._selGeometryType.set("value", "Point");
                this.contentWidget.tcAnnotations.addChild(
                    this._selGeometryType
                );

                this._mapStates.addState(ADD_ANNOTATION_STATE_KEY);
                this._enableEdit = true;
            },

            _buildPrivateAnnotationsSection: function () {
                if (!this._display.config.annotations.scope.read) {
                    domStyle.setStyle(
                        this.headerAccessAnnotations,
                        "display",
                        "none"
                    );
                    domStyle.setStyle(
                        this.tcAccessAnnotations,
                        "display",
                        "none"
                    );
                    return;
                }

                this._buildShowOtherPrivateAnnotations();
                this._bindPrivateAnnEvents();
            },

            _buildShowOtherPrivateAnnotations: function () {
                if (!this._display.config.annotations.scope.manage)
                    return false;

                this._chbShowOtherPrivateAnn = new CheckBox({
                    name: "chbShowOtherPrivateAnnotations",
                    title: i18n.gettext("Other private annotations"),

                    checked: false,
                });
                this.contentWidget.tcAccessAnnotations.addChild(
                    this._chbShowOtherPrivateAnn
                );
                domClass.add(
                    this._chbShowOtherPrivateAnn.domNode,
                    "ann-private"
                );
            },

            _bindPrivateAnnEvents: function () {
                this.contentWidget.chbShowAnnTypes.on(
                    "change",
                    lang.hitch(this, function (value) {
                        const func = value ? domClass.add : domClass.remove;
                        func(document.body, "ann-types-display");
                    })
                );

                this.contentWidget.chbShowPublicAnn.on(
                    "change",
                    lang.hitch(this, this._updateAccessTypeFilters)
                );
                this.contentWidget.chbShowOwnPrivateAnn.on(
                    "change",
                    lang.hitch(this, this._updateAccessTypeFilters)
                );
                if (this._chbShowOtherPrivateAnn) {
                    this._chbShowOtherPrivateAnn.on(
                        "change",
                        lang.hitch(this, this._updateAccessTypeFilters)
                    );
                }
            },

            _filter: null,
            _updateAccessTypeFilters: function () {
                const cWidget = this.contentWidget;
                const filter = {
                    public: cWidget.chbShowPublicAnn.get("checked"),
                    own: cWidget.chbShowOwnPrivateAnn.get("checked"),
                };

                if (this._chbShowOtherPrivateAnn) {
                    filter["private"] =
                        this._chbShowOtherPrivateAnn.get("checked");
                }

                if (JSON.stringify(this._filter) === JSON.stringify(filter)) {
                    return;
                }

                this._filter = filter;
                topic.publish("webmap/annotations/filter/changed", filter);
            },
        }
    );
});
