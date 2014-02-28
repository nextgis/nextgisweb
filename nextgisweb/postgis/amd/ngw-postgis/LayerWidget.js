/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./templates/LayerWidget.html",
    // template
    "dijit/form/ValidationTextBox",
    "dijit/form/Select",
    "dojox/layout/TableContainer",
    "ngw-resource/ResourceBox",
    "ngw/form/SpatialRefSysSelect"
], function (
    declare,
    lang,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: "Слой PostGIS",
        templateString: template,
        prefix: "postgis_layer",
        style: "padding: 1ex;",

        postCreate: function () {
            this.inherited(arguments);

            this.geometryType.set("disabled", this.composite.operation !== "create");
            this.srs.set("disabled", this.composite.operation !== "create");
            this.fields.set("value", this.composite.operation == "create" ? "update" : "keep");
        },

        serializeInMixin: function (data) {
            if (data.postgis_layer === undefined) { data.postgis_layer = {}; }
            var value = data.postgis_layer;
            value.srs = { id: this.srs.get("value") };
        }
    });
});