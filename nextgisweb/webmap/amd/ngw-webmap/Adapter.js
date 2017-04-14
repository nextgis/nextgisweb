define([
    "dojo/_base/declare",
], function (declare) {
    return declare(null, {
        constructor: function (options) {
            declare.safeMixin(options);
        }
    });
});
