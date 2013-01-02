define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/Uploader",
    "dijit/form/ComboBox"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare("vector_layer.Widget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "vector_layer",
        title: "Векторный слой",

        _getValueAttr: function () {
            return {
                file: this.wFile.get("value"),
                encoding: this.wEncoding.get("value")
            };
        }
    });
})