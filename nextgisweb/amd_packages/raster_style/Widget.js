define([
    "dojo/_base/declare",
    "ngw/ObjectWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "style/StyleWidgetBase",
    "dojo/text!./templates/Widget.html",
], function (
    declare,
    ObjectWidget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    StyleWidgetBase,
    template
) {
    return declare("style.Widget", [ObjectWidget, _TemplatedMixin, _WidgetsInTemplateMixin, StyleWidgetBase], {
        templateString: template,
        identity: "raster_style",

        getIData: function () {
            return {};
        }
    });
})