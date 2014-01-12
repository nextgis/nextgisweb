define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {
    return declare([_Base], {
        olClassName: "OpenLayers.Layer",

        constructor: function (name, options) {
            this.olArgs = [name, options];
            this.inherited(arguments);
        } 
    })
});