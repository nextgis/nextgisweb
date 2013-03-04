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
        olClassName: "OpenLayers.Layer.Bing",

        constructor: function (name, options) {
            options.name = name;

            if (!options.key) { options.key = clientSettings.bing_apikey; }
            if (!options.key) { throw "API key required"; }

            this.olArgs = [options];
            this.inherited(arguments);
        }
    });
});