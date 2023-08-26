define(["dojo/_base/declare", "./_Base"], function (declare, _Base) {
    return declare([_Base], {
        olLayerClassName: "layer.Tile",
        olSourceClassName: "source.OSM",

        constructor: function (name, loptions, soptions) {
            if (soptions === undefined) soptions = {};
            soptions.url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
            this.inherited(arguments, [name, loptions, soptions]);
        },
    });
});
