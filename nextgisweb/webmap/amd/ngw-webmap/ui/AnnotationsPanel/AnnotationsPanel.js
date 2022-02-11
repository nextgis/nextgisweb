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
            _chbAddAnnotations: null,

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
                const showAnnLayer = this._display.config.annotations.default;

                this.contentWidget.chbAnnotationsShow.set(
                    "value",
                    showAnnLayer
                );
                this.contentWidget.chbAnnShowMessages.set(
                    "value",
                    showAnnLayer
                );

                if (!showAnnLayer) {
                    this.toggleAccessTypesChb(false);
                    this.contentWidget.chbAnnShowMessages.set("disabled", true);
                }

                this.contentWidget.chbShowAnnTypes.set("value", true);
                this.contentWidget.chbShowPublicAnn.set("value", true);
                this.contentWidget.chbShowOwnPrivateAnn.set("value", true);
            },

            setAnnotationsShow: function (value) {
                this.contentWidget.chbAnnotationsShow.set("value", value);
            },

            setMessagesShow: function (value) {
                this.contentWidget.chbAnnShowMessages.set("value", value);
            },

            _bindEvents: function () {
                var deactivateAnnotationState = lang.hitch(
                    this,
                    function (value) {
                        if (
                            !value &&
                            this._enableEdit &&
                            this._mapStates.getActiveState() ===
                                ADD_ANNOTATION_STATE_KEY
                        ) {
                            if (this._chbAddAnnotations.get("checked"))
                                this._chbAddAnnotations.set("checked", false);
                        }
                    }
                );

                this.contentWidget.chbAnnotationsShow.on(
                    "change",
                    lang.hitch(this, function (value) {
                        this._filter
                        topic.publish("/annotations/visible", value);
                        this.contentWidget.chbAnnShowMessages.set(
                            "disabled",
                            !value
                        );
                        deactivateAnnotationState(value);
                        this.toggleAccessTypesChb(value);
                    })
                );

                this.contentWidget.chbAnnShowMessages.on(
                    "change",
                    function (value) {
                        topic.publish("/annotations/messages/visible", value);
                        deactivateAnnotationState(value);
                    }
                );

                if (this._chbAddAnnotations && this._enableEdit) {
                    this._chbAddAnnotations.on(
                        "change",
                        lang.hitch(this, function (value) {
                            if (value) {
                                this._mapStates.activateState(
                                    ADD_ANNOTATION_STATE_KEY
                                );
                                topic.publish(
                                    "webmap/annotations/add/activate"
                                );
                                this.setAccessTypesForEdit();
                            } else {
                                this._mapStates.deactivateState(
                                    ADD_ANNOTATION_STATE_KEY
                                );
                                topic.publish(
                                    "webmap/annotations/add/deactivate"
                                );
                                this.enableAccessTypesAfterEdit();
                            }
                        })
                    );
                }
            },

            setAccessTypesForEdit: function () {
                this.contentWidget.chbShowPublicAnn
                    .set("checked", true)
                    .set("disabled", true);
                this.contentWidget.chbShowOwnPrivateAnn
                    .set("checked", true)
                    .set("disabled", true);
                if (this._chbShowOtherPrivateAnn) {
                    this._chbShowOtherPrivateAnn
                        .set("checked", true)
                        .set("disabled", true);
                }
                this._updateAccessTypeFilters();
            },

            enableAccessTypesAfterEdit: function () {
                this.toggleAccessTypesChb(true);
                this._updateAccessTypeFilters();
            },

            toggleAccessTypesChb: function (enabled) {
                const disabled = !enabled;
                this.contentWidget.chbShowPublicAnn.set("disabled", disabled);
                this.contentWidget.chbShowOwnPrivateAnn.set(
                    "disabled",
                    disabled
                );
                if (this._chbShowOtherPrivateAnn) {
                    this._chbShowOtherPrivateAnn.set("disabled", disabled);
                }
            },

            _buildAnnotationEditTool: function () {
                if (!this._display.config.annotations.scope.write) return false;

                this._chbAddAnnotations = new CheckBox({
                    name: "chbAddAnnotations",
                    title: i18n.gettext("Edit annotations"),
                    checked: false,
                });
                this.contentWidget.tcAnnotations.addChild(
                    this._chbAddAnnotations
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
