/*global define*/
define([
    "dojo/_base/declare",
    "./_Base",
    "ngw/async!//maps.google.com/maps/api/js?v=3"
], function (
    declare,
    _Base
) {

    return declare([_Base], {
        olClassName: "OpenLayers.Layer.Google",

        constructor: function (name, options) {
            this.olArgs = [name, options];
            if (options.numZoomLevels === undefined) { options.numZoomLevels = 19; }
            this.inherited(arguments);
        }
    });
});
