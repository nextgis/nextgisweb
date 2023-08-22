define([
    "dojo/_base/declare",
    "./_PluginBase",
    "@nextgisweb/pyramid/api",
], function (declare, _PluginBase, api) {
    return declare([_PluginBase], {
        zoomToAllLayers: function () {
            const webmapId = this.display.config.webmapId;
            api.route("webmap.extent", webmapId)
                .get()
                .then((extent) => {
                    if (!extent) return;
                    this.display.map.zoomToNgwExtent(
                        extent,
                        this.display.displayProjection
                    );
                });
        },
    });
});
