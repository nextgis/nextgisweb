define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare("style.StyleWidgetBase", [], {
        constructor: function (options) {
            if (options.data && options.data[this.identity]) {
                this.iData = options.data[this.identity];
            } else {
                this.iData = {};
            };

            if (options.config && options.config[this.identity]) {
                this.iConfig = options.config[this.identity];
            } else {
                this.iConfig = {};
            }
        }
    });
})