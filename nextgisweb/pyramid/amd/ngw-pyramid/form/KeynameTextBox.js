define([
    "dojo/_base/declare",
    "dijit/form/ValidationTextBox"
], function (declare, ValidationTextBox) {
    return declare([ValidationTextBox], {

        preamble: function (kwArgs) {
            kwArgs.pattern = '[A-z][A-z0-9_\\-]*';
        },

        _getValueAttr: function () {
            var val = this.inherited(arguments);
            if (val === '') { val = null; }
            return val;
        }
    });
});
