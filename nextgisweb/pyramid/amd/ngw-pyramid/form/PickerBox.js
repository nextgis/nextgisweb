/* global define, console */
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/when",
    "dojo/json",
    "dijit/form/MappedTextBox",
    "dojo/text!./template/PickerBox.html"
], function (
    declare,
    lang,
    when,
    json,
    MappedTextBox,
    template
) {
    return declare("ngw-pyramid.form.PickerBox", [MappedTextBox], {

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
            // FIXME: Тут не вызывается this.inherited, соответственно не работает
            // watch("value"), что очень неудобно. Однако если вызывать то тоже
            // получается полная петрушка.

            if (this._value === value) { return; }

            this._value = value;
            this.valueNode.value = json.stringify(value);

            when(this.getLabel(value)).then(lang.hitch(this, function (value) {
                this.textbox.value = value;
            }));
        },

        _getValueAttr: function () {
            return this._value;
        },

        _buttonClick: function () {
            this.emit("pick", {});
        }
    });
});
