define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "ngw/ObjectWidget",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/on",
    "dojo/text!./templates/Widget.html",
    // template
    "dojox/layout/TableContainer",
    "ngw/form/DisplayNameTextBox",
    "ngw/form/KeynameTextBox",
    "dijit/form/Textarea"
], function (
    declare,
    array,
    ObjectWidget,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    on,
    template
) {
    return declare("layer.Widget", [ObjectWidget, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        identity: "layer",
        title: "Слой",

        postCreate: function () {
            this.watch("disabled", function (attr, oldVal, newVal) {
                array.forEach([this.wDisplayName, this.wKeyname, this.wDescription], function (w) {
                    w.set(attr, newVal);
                });
            });
        },

        validate: function () {
            var widget = this;

            var isValid = true;
            array.forEach(['wDisplayName', 'wKeyname'], function (k) {
                var w = widget[k];
                w._hasBeenBlurred = true;
                w.validate();
                isValid = isValid && w.isValid();
            });

            return isValid;
        },

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