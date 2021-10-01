define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {
    return declare([_Base], {
        olLayerClassName: "layer.Tile",
        olSourceClassName: "source.OSM",

        constructor: function(name, loptions, soptions) {
            this.inherited(arguments);
        }
    });
});
