/*global define*/
define([
    "dojo/_base/declare",
    "./_Base",
    "ngw/settings!webmap"
], function (
    declare,
    _Base,
    clientSettings
) {

    return declare([_Base], {
        olLayerClassName: "layer.Tile",
        olSourceClassName: "source.BingMaps",

        constructor: function(name, loptions, soptions) {
            if (soptions.wrapX === undefined) { soptions.wrapX = false; }

            if (!soptions.key) { soptions.key = clientSettings.bing_apikey; }
            if (!soptions.key) { throw "API key required"; }

            this.inherited(arguments);
        }
    });
});
