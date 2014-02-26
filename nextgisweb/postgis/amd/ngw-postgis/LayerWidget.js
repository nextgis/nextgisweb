/* globals define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-resource/ResourceStore",
    "ngw-resource/ResourcePicker",
    // resource
    "dojo/text!./templates/LayerWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer",
    "ngw/form/PickerBox",
    "ngw/form/SpatialRefSysSelect"
], function (
    declare,
    lang,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    ResourceStore,
    ResourcePicker,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: "Слой PostGIS",
        templateString: template,
        prefix: "postgis_layer",
        style: "padding: 1ex;",

        constructor: function () {
            this.connectionPicker = new ResourcePicker({cls: "postgis_connection"});
        },

        postCreate: function () {
            this.inherited(arguments);

            this.geometryType.set("disabled", this.composite.operation !== "create");
            this.srs.set("disabled", this.composite.operation !== "create");

            this.fields.set("value", this.composite.operation == "create" ? "update" : "keep");
        },

        buildRendering: function () {
            this.inherited(arguments);

            this.wConnectionId.set("store", new ResourceStore());
            this.wConnectionId.on("pick", lang.hitch(this, function () {
                this.connectionPicker.pick().then(lang.hitch(this, function (itm) {
                    this.wConnectionId.set("value", itm.id);
                })).otherwise(console.error);
            }));
        },

        serializeInMixin: function (data) {
            if (data.postgis_layer === undefined) { data.postgis_layer = {}; }
            var value = data.postgis_layer;

            value.connection = { id: this.wConnectionId.get("value") };
            value.srs = { id: this.srs.get("value") };
        },

        deserializeInMixin: function (data) {
            this.wConnectionId.set("value", data.postgis_layer.connection.id);
        }

    });
});