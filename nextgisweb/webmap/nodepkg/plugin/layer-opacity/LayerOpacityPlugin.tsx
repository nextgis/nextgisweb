import LayerOpacitySlider from "@nextgisweb/webmap/layer-opacity-slider";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

export class LayerOpacityPlugin extends PluginBase {
  render({ nodeData }: PluginState) {
    return (
      <LayerOpacitySlider
        defaultValue={nodeData.opacity ?? 1}
        onChange={(val) => {
          nodeData.update({ opacity: val });
        }}
      />
    );
  }
}
