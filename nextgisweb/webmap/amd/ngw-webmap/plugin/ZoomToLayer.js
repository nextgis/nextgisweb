define([
    "dojo/_base/declare",
    "./_PluginBase",
    "dojo/request/xhr",
    "ngw/route",
    "@nextgisweb/pyramid/i18n!",
    "openlayers/ol"
], function (
    declare,
    _PluginBase,
    xhr,
    route,
    i18n,
    ol
) {
    return declare([_PluginBase], {
        
        getPluginState: function (nodeData) {
            const {type} = nodeData;
            return {
                enabled: type === "layer" &&
                    nodeData.plugin[this.identity],
            };
        },
        
        run: function () {
            this.zoomToLayer();
            return Promise.resolve(undefined);
        },

        zoomToLayer: function () {
            var plugin = this,
                item = this.display.dumpItem();

            xhr.get(route.layer.extent({id: item.layerId}), {
                handleAs: "json"
            }).then(function ({extent}) {
                plugin.display.map.zoomToNgwExtent(extent, plugin.display.displayProjection);
            });
        }
    });
});
