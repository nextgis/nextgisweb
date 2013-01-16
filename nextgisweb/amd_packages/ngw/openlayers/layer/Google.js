define([
    "dojo/_base/declare",
    "./_Base",
    "ngw/async!http://maps.google.com/maps/api/js?v=3&sensor=false"
], function (
    declare,
    _Base
) {

    return declare([_Base], {
        olClassName: "OpenLayers.Layer.Google",

        constructor: function (name, options) {
            this.olArgs = [options];
            this.inherited(arguments);
        } 
    })
});