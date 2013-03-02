/*global define*/
define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare([], {
        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        postCreate: function () { },

        startup: function () { }
    });
});
