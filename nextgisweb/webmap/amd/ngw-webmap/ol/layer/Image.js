define(["dojo/_base/declare", "./_Base"], function (declare, _Base) {
    return declare([_Base], {
        olLayerClassName: "layer.Image",
        olSourceClassName: "source.ImageWMS",

        constructor: function () {
            this.inherited(arguments);
        },

        _symbolsSetter: function (value) {
            this.inherited(arguments);
            this.olSource.updateParams({
                symbols: value,
            });
        },
    });
});
