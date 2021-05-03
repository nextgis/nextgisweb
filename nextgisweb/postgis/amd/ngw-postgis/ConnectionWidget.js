/* globals define */
define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "@nextgisweb/pyramid/i18n!",
    "ngw-resource/serialize",
    // resource
    "dojo/text!./template/ConnectionWidget.hbs",
    // template
    "dijit/form/ValidationTextBox",
    "dojox/layout/TableContainer"
], function (
    declare,
    array,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    i18n,
    serialize,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        title: i18n.gettext("PostGIS connection"),
        templateString: i18n.renderTemplate(template),
        prefix: "postgis_connection",

        serializeInMixin: function (data) {
            var value = data.postgis_connection;
            if (value.port === "") {
                value.port = null;
            }
        }
    });
});
