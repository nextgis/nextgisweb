define([
    "dojo/_base/declare",
    "./_PluginBase",
    "@nextgisweb/webmap/layer-opacity-slider",
], function (declare, _PluginBase, LayerOpacitySlider) {
    return declare([_PluginBase], {
        getPluginState: function (nodeData) {
            return {
                enabled:
                    nodeData.type === "layer" && nodeData.plugin[this.identity],
                nodeData: nodeData,
                map: this.display.map,
            };
        },

        render: function (state) {
            const store = this.display.webmapStore;
            var id = state.nodeData.id;
            var defaultValue = state.nodeData.transparency;
            return LayerOpacitySlider.default({
                defaultValue: 100 - defaultValue,
                onChange: function (val) {
                    state.nodeData.transparency = 100 - val;
                    store.setLayerOpacity(id, val / 100);
                },
            });
        },
    });
});
