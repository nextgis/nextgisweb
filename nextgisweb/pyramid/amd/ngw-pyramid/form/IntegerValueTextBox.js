define([
    "dojo/_base/declare",
    "dijit/form/ValidationTextBox"
], function (declare, ValidationTextBox) {
    return declare([ValidationTextBox], {

        preamble: function (kwArgs) {
            kwArgs.pattern = '[1-9][0-9]*';
        },

        _getValueAttr: function () {
            var val = this.inherited(arguments);
            if (val === '') { val = null; }
            return val;
        }
    });
});

