import LayerOpacitySlider from "@nextgisweb/webmap/layer-opacity-slider";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

export class LayerOpacityPlugin extends PluginBase {
    render({ nodeData }: PluginState) {
        const { transparency } = nodeData;

        const defaultValue = 100 - Number(transparency);

        return (
            <LayerOpacitySlider
                defaultValue={defaultValue}
                onChange={(val) => {
                    nodeData.update({ transparency: 100 - val });
                }}
            ></LayerOpacitySlider>
        );
    }
}
