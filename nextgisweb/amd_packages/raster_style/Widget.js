define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "style/StyleWidgetBase",
    "dojo/text!./templates/Widget.html",
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    StyleWidgetBase,
    template
) {
    return declare("style.Widget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, StyleWidgetBase], {
        templateString: template,
        identity: "raster_style",

        getIData: function () {
            return {};
        }
    });
})