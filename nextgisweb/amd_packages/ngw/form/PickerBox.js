/* global define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/when",
    "dojo/json",
    "dijit/form/MappedTextBox",
    "dojo/text!./templates/PickerBox.html"
], function (
    declare,
    lang,
    when,
    json,
    MappedTextBox,
    template
) {
    return declare("ngw.form.PickerBox", [MappedTextBox], {

        templateString: template,

        baseClass: "dijitTextBox dijitComboBox",

        required: false,

        buildRendering: function () {
            this.inherited(arguments);
            this.textbox.disabled = true;
        },

        updateLabel: function (itm) {
            this.textbox.value = (itm === null) ? "" : itm.display_name;
        },

        _setValueAttr: function (value) {
            if (this._value === value) { return; }

            this._value = value;
            this.valueNode.value = json.stringify(value);

            when(this.store.get(value)).then(
                lang.hitch(this, this.updateLabel)
            ).otherwise(console.error);
        },

        _getValueAttr: function () {
            return this._value;
        },

        _buttonClick: function () {
            this.emit("pick", {});
        }
    });
});