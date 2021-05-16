define([
    "dojo/_base/declare",
    "./_Base"
], function (
    declare,
    _Base
) {
    return declare([_Base], {
        olLayerClassName: "layer.Image",
        olSourceClassName: "source.ImageWMS",

        constructor: function(name, options, soptions) {
            this.inherited(arguments);
        }
    });
});
