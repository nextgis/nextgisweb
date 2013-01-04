define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "style/StyleWidgetBase",
    "dojo/text!./templates/Widget.html",
], function (
    declare,
    Widget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    StyleWidgetBase,
    template
) {
    return declare([Widget, _TemplatedMixin, _WidgetsInTemplateMixin, StyleWidgetBase], {
        templateString: template,
        identity: "raster_style",

        getIData: function () {
            return {};
        }
    });
})