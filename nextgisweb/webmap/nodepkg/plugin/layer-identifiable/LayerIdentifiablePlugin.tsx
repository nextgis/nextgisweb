import { Checkbox } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

export class LayerIdentifiablePlugin extends PluginBase {
    getPluginState(nodeData: TreeLayerStore): PluginState {
        const stat = super.getPluginState(nodeData);
        stat.enabled = stat.enabled && !!nodeData.identification;
        return stat;
    }

    render({ nodeData }: PluginState) {
        const { identifiable } = nodeData;

        return (
            <Checkbox
                style={{ padding: "5px 10px" }}
                defaultChecked={identifiable}
                onChange={(e) => {
                    nodeData.update({ identifiable: e.target.checked });
                }}
            >
                {gettext("Identifiable")}
            </Checkbox>
        );
    }
}
