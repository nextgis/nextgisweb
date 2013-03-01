define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {

    return declare([_Base], {
        olClassName: "OpenLayers.Layer.Bing",

        constructor: function (name, options) {
            options.name = name;
            this.olArgs = [options];
            this.inherited(arguments);
        } 
    })
});