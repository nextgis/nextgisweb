define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {
    return declare([_Base], {
        olClassName: "OpenLayers.Layer.XYZ",

        constructor: function (name, options) {
            this.olArgs = [name, options.url, options];
            this.inherited(arguments);
        } 
    })
});