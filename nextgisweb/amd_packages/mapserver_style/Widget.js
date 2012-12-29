define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "style/StyleWidgetBase",
    "dojo/text!./templates/Widget.html",
    "dojox/layout/TableContainer",
    "dijit/layout/TabContainer",
    "dijit/form/TextBox",
    "dijit/ColorPalette",
    "dijit/form/NumberSpinner"
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
        identity: "mapserver_style",

        postCreate: function () {
            if (this.iData.opacity) { this.opacityWidget.set("value", this.iData.opacity) };
            if (this.iData.stroke_width) { this.strokeWidthWidget.set("value", this.iData.stroke_width) };
            if (this.iData.stroke_color) { this.strokeColorWidget.set("value", "#" + this.iData.stroke_color) };
            if (this.iData.fill_color) { this.fillColorWidget.set("value", "#" + this.iData.fill_color) };
        },

        getIData: function () {
            return {
                opacity: this.opacityWidget.get("value"),
                stroke_width: this.strokeWidthWidget.get("value"),
                stroke_color: this.strokeColorWidget.get("value").substring(1),
                fill_color: this.fillColorWidget.get("value").substring(1)
            };
        }
    });
})