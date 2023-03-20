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
                id: nodeData.id,
                defaultValue: nodeData.transparency,
            };
        },

        render: function (state) {
            var map = this.display.map;
            return LayerOpacitySlider.default({
                defaultValue: state.defaultValue,
                onChange: function (val) {
                    var layer = map.layers[state.id];
                    if (layer && layer.olLayer && layer.olLayer.setOpacity) {
                        layer.olLayer.setOpacity(val / 100);
                    }
                },
            });
        },
    });
});
