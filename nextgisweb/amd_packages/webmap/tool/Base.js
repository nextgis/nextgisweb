define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare([], {
        display: undefined,
        label: "Инструмент",

        constructor: function (params) {
            declare.safeMixin(this, params);
        },

        activate: function () {

        },

        deactivate: function () {
            
        }
    });
});