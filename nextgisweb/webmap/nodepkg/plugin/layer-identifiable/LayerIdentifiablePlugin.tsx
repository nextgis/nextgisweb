import { Checkbox } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

export class LayerIdentifiablePlugin extends PluginBase {
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
