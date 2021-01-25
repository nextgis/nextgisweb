define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "ngw-resource/serialize",
    "ngw-pyramid/i18n!raster_mosaic",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/Widget.hbs",
    "dijit/form/CheckBox",
    "dojox/layout/TableContainer"
], function (
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
        title: i18n.gettext("Raster mosaic"),
        prefix: "raster_mosaic",

        serializeInMixin: function (data) {
            var value = data.raster_mosaic;
            value.addalpha = (value.addalpha === "on") ? true : false;
        }
    });
});
