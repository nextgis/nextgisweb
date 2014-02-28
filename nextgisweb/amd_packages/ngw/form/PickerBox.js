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

        constructor: function () {
            this._value = null;
        },

        buildRendering: function () {
            this.inherited(arguments);
            this.textbox.disabled = true;
        },

        getLabel: function (value) {
            if (value === null) { return ""; }
            return this.store.get(value).then(function (data) {
                return data.display_name;
            });
        },

        _setValueAttr: function (value) {
            if (this._value === value) { return; }

            this._value = value;
            this.valueNode.value = json.stringify(value);

            when(this.getLabel(value)).then(lang.hitch(this, function (value) {
                this.textbox.value = value;
            })).then(null, console.error);
        },

        _getValueAttr: function () {
            return this._value;
        },

        _buttonClick: function () {
            this.emit("pick", {});
        }
    });
});