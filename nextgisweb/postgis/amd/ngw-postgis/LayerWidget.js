/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-pyramid/i18n!postgis",
    "ngw-pyramid/hbs-i18n",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/LayerWidget.hbs",
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
    i18n,
    hbsI18n,
    serialize,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: i18n.gettext("PostGIS layer"),
        templateString: hbsI18n(template, i18n),
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
            if (value.geometry_type === "") {
                value.geometry_type = null;
            }
        }
    });
});