define(["dojo/_base/declare", "./_Base"], function (declare, _Base) {
    return declare([_Base], {
        olLayerClassName: "layer.Vector",
        olSourceClassName: "source.Vector",

        constructor: function () {
            this.inherited(arguments);
        },
    });
});
