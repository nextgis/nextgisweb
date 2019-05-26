define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!render",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/TileCacheWidget.hbs",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer",
    "ngw-pyramid/form/IntegerValueTextBox"
], function(
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    serialize,
    i18n,
    hbsI18n,
    template
) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, serialize.Mixin], {
        templateString: hbsI18n(template, i18n),
        title: i18n.gettext("Tile cache"),
        prefix: "tile_cache",

        serializeInMixin: function (data) {
            var value = data.tile_cache;
            value.enabled = (value.enabled === "on") ? true : false;
        }
    });
});