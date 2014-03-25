/*global define*/
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "./_Base",
    "ngw/settings!webmap"
], function (
    declare,
    lang,
    _Base,
    clientSettings
) {

    return declare([_Base], {
        olClassName: "OpenLayers.Layer.Bing",

        constructor: function (name, options) {
            options = lang.clone(options);
            options.name = name;

            if (options.wrapDateLine === undefined) { options.wrapDateLine = true; }

            if (!options.key) { options.key = clientSettings.bing_apikey; }
            if (!options.key) { throw "API key required"; }

            this.olArgs = [options];
            this.inherited(arguments);
        }
    });
});