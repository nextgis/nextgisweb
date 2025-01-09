import LayerOpacitySlider from "@nextgisweb/webmap/layer-opacity-slider";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

export class LayerOpacityPlugin extends PluginBase {
    render({ nodeData }: PluginState) {
        const { transparency, id } = nodeData;

        const store = this.display.webmapStore;

        const defaultValue = 100 - Number(transparency);

        return (
            <LayerOpacitySlider
                defaultValue={defaultValue}
                onChange={(val) => {
                    nodeData.transparency = 100 - val;
                    store.setLayerOpacity(Number(id), val / 100);
                }}
            ></LayerOpacitySlider>
        );
    }
}
