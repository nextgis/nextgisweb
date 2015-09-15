define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare(null, {
        display: null,

        label: "Tool",

        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        activate: function () {

        },

        deactivate: function () {
            
        }
    });
});