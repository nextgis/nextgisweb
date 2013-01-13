define([
    "dojo/_base/declare",
    "./Widget",
    "./ErrorDisplayMixin",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/DeleteWidget.html",
    // template
    "dijit/form/CheckBox"
], function (
    declare,
    Widget,
    ErrorDisplayMixin,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare([Widget, ErrorDisplayMixin, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        title: "Удаление",

        constructor: function (params) {
            this.title = this.title + ": " + params.clsDisplayName;
        },

        _getValueAttr: function () {
            return this.wConfirm.get("checked")
        }
    });
});