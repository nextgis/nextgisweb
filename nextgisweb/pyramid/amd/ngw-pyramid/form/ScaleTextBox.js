define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojo/number",
    "dijit/form/ValidationTextBox",
    "ngw-pyramid/i18n!pyramid",
], function (
    declare,
    _WidgetBase,
    number,
    ValidationTextBox,
    i18n
) {
    return declare(_WidgetBase, {
        constructor: function (params) {
            this._textbox = new ValidationTextBox({
                pattern: "1\\ *: *" + number.regexp(),
                invalidMessage: i18n.gettext("Enter the correct scale value, e.g. 1:") + number.format(10000),
                required: params.required,
                style: "width: 100%"
            });
        },

        postCreate: function () {
            this.inherited(arguments);

            this._textbox.placeAt(this.domNode);

            var widget = this;
            this._textbox.watch("value", function (attr, oldVal, newVal) {
                if (widget._textbox.isValid() && newVal !== "") {
                    var comp = newVal.split(":");
                    widget.set("value", number.parse(comp[1].replace(" ", "")));
                } else {
                    widget.set("value", null);
                }
            });

        },

        value: null,

        _setValueAttr: function (value) {
            if (this.value != value) {
                this._set("value", value);
                if (this._textbox.isValid()) {
                    this._textbox.set("value", value ? "1 : " + number.format(value) : null);
                }
            }
        }
    });
});
