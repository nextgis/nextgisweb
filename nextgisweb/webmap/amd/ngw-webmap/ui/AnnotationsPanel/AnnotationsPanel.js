define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-construct",
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
                this._buildAnnotationTool();

                AnnotationsManager.getInstance({
                    display: this.display,
                    panel: this,
                });
            },

            _setDefaultValues: function () {
                var toShowAnnotationLayer = this._display.config.annotations
                    .default;
                this.contentWidget.chbAnnotationsShow.set(
                    "value",
                    toShowAnnotationLayer
                );
                this.contentWidget.chbAnnotationsShowMessages.set(
                    "value",
                    toShowAnnotationLayer
                );
            },

            setAnnotationsShow: function (value) {
                this.contentWidget.chbAnnotationsShow.set("value", value);
            },

            setMessagesShow: function (value) {
                this.contentWidget.chbAnnotationsShowMessages.set(
                    "value",
                    value
                );
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
                        topic.publish("/annotations/visible", value);
                        this.contentWidget.chbAnnotationsShowMessages.set(
                            "disabled",
                            !value
                        );
                        deactivateAnnotationState(value);
                    })
                );

                this.contentWidget.chbAnnotationsShowMessages.on(
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
                            } else {
                                this._mapStates.deactivateState(
                                    ADD_ANNOTATION_STATE_KEY
                                );
                                topic.publish(
                                    "webmap/annotations/add/deactivate"
                                );
                            }
                        })
                    );
                }
            },

            _buildAnnotationTool: function () {
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
        }
    );
});
