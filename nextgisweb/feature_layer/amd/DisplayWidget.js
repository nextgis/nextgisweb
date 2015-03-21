define([
    "dojo/_base/declare",
    "dijit/_WidgetBase"
], function (
    declare,
    _WidgetBase
) {
    return declare([_WidgetBase], {
        renderValue: function () { /* abstract */ }
    });
});