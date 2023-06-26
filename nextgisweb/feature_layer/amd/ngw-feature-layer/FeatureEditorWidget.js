define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "ngw-pyramid/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/feature-layer/feature-editor",
    "@nextgisweb/gui/react-app",
    "./loader!",
    "xstyle/css!./resource/FeatureEditorWidget.css",
], function (
    declare,
    lang,
    domClass,
    _WidgetBase,
    Button,
    ContentPane,
    BorderContainer,
    TabContainer,
    TableContainer,
    ErrorDialog,
    i18n,
    editor,
    reactApp,
    loader
) {
    var FieldsWidget = declare([TableContainer], {
        title: i18n.gettext("Attributes"),
        style: "padding: 16px; box-sizing: border-box; height: 100%; overflow: auto;",
        labelWidth: "20%",

        buildRendering: function () {
            this.inherited(arguments);
            this.component = reactApp.default(
                editor.AttributesForm,
                { store: this.store },
                this.domNode
            );
        },
        destroy: function () {
            if (this.component) {
                this.component.unmount();
            }
            this.component = null;
        },
    });

    return declare([BorderContainer], {
        gutters: false,

        destroy: function () {
            this.store.destroy();
            this.store = null;
        },

        buildRendering: function () {
            this.inherited(arguments);

            this.store = new editor.FeatureEditorStore({
                resourceId: this.resource,
                featureId: this.feature,
            });

            this._tabContainer = new TabContainer({ region: "center" });
            this._tabContainer.placeAt(this);

            this._lockContainer = new ContentPane({
                region: "center",
                style: "display: none; border: 1px solid silver; background-color: #fff",
                content: i18n.gettext("Please wait. Processing request..."),
            }).placeAt(this);

            this._fwidget = new FieldsWidget({ store: this.store }).placeAt(
                this._tabContainer
            );

            this._ext = {};
            for (var k in loader) {
                var widget = new loader[k]({
                    resource: this.resource,
                    feature: this.feature,
                    store: this.store,
                    extension: k,
                });
                widget.placeAt(this._tabContainer);
                this._ext[k] = widget;
            }

            this._btnPane = new ContentPane({
                region: "bottom",
                style: "padding-left: 0; padding-right: 0",
            });

            this._btnPane.placeAt(this);
            domClass.add(this._btnPane.domNode, "ngwButtonStrip");

            this.btn = new Button({
                label: i18n.gettext("Save"),
                onClick: lang.hitch(this, this.save),
            }).placeAt(this._btnPane);

            domClass.add(this.btn.domNode, "dijitButton--primary");
        },

        lock: function () {
            this._tabContainer.domNode.style.display = "none";
            this._lockContainer.domNode.style.display = "block";
            this.btn.set("disabled", true);
        },

        unlock: function () {
            this._lockContainer.domNode.style.display = "none";
            this._tabContainer.domNode.style.display = "block";
            this.btn.set("disabled", false);
        },

        load: function () {
            var widget = this;

            this.store._initialize().then(function () {
                var data = widget.store._featureItem;
                // backward compatibility with no mobx widgets
                for (var k in loader) {
                    var ext = widget._ext[k];
                    if (ext.set) {
                        ext.set("value", data.extensions[k]);
                    }
                }
                widget.resize();
            });
        },

        save: function () {
            this.lock();

            var extensions = {};

            // backward compatibility with no mobx widgets
            for (var k in loader) {
                var ext = this._ext[k];
                if (ext.get) {
                    var val = ext.get("value");
                    if (val !== null) {
                        extensions[k] = val
                    }
                }
            }

            this.store
                .save({ extensions: extensions })
                .then(this.load.bind(this))
                .catch(ErrorDialog.xhrError)
                .finally(this.unlock.bind(this));
        },
    });
});
