define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/request/xhr",
    "dojo/json",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/number",
    "dijit/_WidgetBase",
    "dijit/form/Button",
    "dijit/form/TextBox",
    "dijit/form/NumberTextBox",
    "dijit/form/DateTextBox",
    "dijit/form/TimeTextBox",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "dijit/layout/TabContainer",
    "dojox/layout/TableContainer",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "@nextgisweb/pyramid/i18n!",
    "@nextgisweb/feature-layer/feature-editor",
    "@nextgisweb/gui/react-app",
    "./loader!",
    "xstyle/css!./resource/FeatureEditorWidget.css",
], function (
    declare,
    lang,
    array,
    xhr,
    json,
    domClass,
    domConstruct,
    number,
    _WidgetBase,
    Button,
    TextBox,
    NumberTextBox,
    DateTextBox,
    TimeTextBox,
    ContentPane,
    BorderContainer,
    TabContainer,
    TableContainer,
    route,
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
            this.store.initialize();

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

        iurl: function () {
            var urlStr = route.feature_layer.feature.item({
                id: this.resource,
                fid: this.feature,
            });
            var params = new URLSearchParams({ dt_format: "iso" });
            return [urlStr, params].join("?");
        },

        load: function () {
            var widget = this;

            xhr(this.iurl(), {
                method: "GET",
                handleAs: "json",
                preventCache: true,
            }).then(function (data) {
                for (var k in loader) {
                    widget._ext[k].set("value", data.extensions[k]);
                }

                widget.resize();
            });
        },

        save: function () {
            this.lock();

            var data = {
                fields: this.store.attributes,
                extensions: {},
            };

            for (var k in loader) {
                data.extensions[k] = this._ext[k].get("value");
            }

            xhr(this.iurl(), {
                method: "PUT",
                handleAs: "json",
                data: json.stringify(data),
                headers: {
                    "Content-Type": "application/json",
                },
            })
                .then(this.load.bind(this), ErrorDialog.xhrError)
                .finally(this.unlock.bind(this));
        },
    });
});
