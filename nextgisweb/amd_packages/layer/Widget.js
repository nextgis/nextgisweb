define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "dijit/form/TextBox",
    "ngw/form/KeynameTextBox",
    "dijit/form/Textarea"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template
) {
    return declare("layer.Widget", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "layer",
        title: "Слой",

        _setValueAttr: function (value) {
            this.wDisplayName.set("value", value["display_name"]);
            this.wKeyname.set("value", value["keyname"]);
            this.wDescription.set("value", value["description"]);
        },

        _getValueAttr: function () {
            return {
                display_name: this.wDisplayName.get("value"),
                keyname: this.wKeyname.get("value"),
                description: this.wDescription.get("value")
            }
        }
    });
})