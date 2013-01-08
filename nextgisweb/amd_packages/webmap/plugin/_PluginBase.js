define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare([], {
        constructor: function (options) {
            declare.safeMixin(this, options);
        }
    })
});
