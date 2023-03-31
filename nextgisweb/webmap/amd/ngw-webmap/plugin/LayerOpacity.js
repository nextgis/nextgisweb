define([
    "dojo/_base/declare",
    "./_PluginBase",
    "@nextgisweb/webmap/layer-opacity-slider",
], function (
    declare,
    _PluginBase,
    LayerOpacitySlider
) {
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
            var map = state.map;
            var id = state.nodeData.id;
            var defaultValue = state.nodeData.transparency;
            return LayerOpacitySlider.default({
                defaultValue: 100 - defaultValue,
                onChange: function (val) {
                    var layer = map.layers[id];
                    if (layer && layer.olLayer && layer.olLayer.setOpacity) {
                        state.nodeData.transparency = 100 - val;
                        layer.olLayer.setOpacity(val / 100);
                    }
                },
            });
        },
    });
});