define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "./_Base"
], function (
    declare,
    lang,
    _Base
) {
    return declare([_Base], {
        olClassName: "OpenLayers.Layer",

        constructor: function (name, options) {
            options = lang.clone(options);

            if (options.wrapDateLine === undefined) { options.wrapDateLine = true; }
            if (options.numZoomLevels === undefined) { options.numZoomLevels = 20; }

            this.olArgs = [name, options];
            this.inherited(arguments);
        }
    });
});