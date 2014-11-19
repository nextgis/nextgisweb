define([
    "dojo/_base/declare",
    "ngw/modelWidget/Widget",
    "dojo/_base/array",
    "dojox/layout/TableContainer",
    "dijit/form/TextBox"
], function (
    declare,
    Widget,
    array,
    TableContainer,
    TextBox
) {
    return declare([TableContainer, Widget], {
        title: "Атрибуты",

        preamble: function () {
            this.inherited(arguments);
            this.cols = 1;
        },

        constructor: function (options) {
            this._widgets = {};
        },

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;
            array.forEach(widget.fields, function (f) {
                var textbox = new TextBox({
                    label: f.keyname,
                    style: "width: 100%"
                });
                widget._widgets[f.keyname] = textbox;
                widget.addChild(textbox);
            });

            this.set("value", this.value);
        },

        _getValueAttr: function () {
            var result = {};
            var widget = this;
            array.forEach(Object.keys(this._widgets), function (k) {
                var wgtval = widget._widgets[k].get("value");
                if (wgtval == "") { wgtval = null };
                result[k] = wgtval;
            });
            return result;
        },

        _setValueAttr: function (value) {
            var widget = this;
            array.forEach(Object.keys(this._widgets), function (k) {
                widget._widgets[k].set("value", value? value[k] : undefined);
            });
        }
    });
});