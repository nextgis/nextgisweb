import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { EDITING_ID } from "@nextgisweb/webmap/constant";
import type {
    PluginMenuItem,
    PluginParams,
    PluginState,
} from "@nextgisweb/webmap/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { PluginBase } from "../PluginBase";
import type { LayerEditorWebMapPluginConfig } from "../type";

import { setItemsEditable } from "./util/setItemsEditable";

export class LayerEditor extends PluginBase {
    private disabled = true;

    constructor(options: PluginParams) {
        super(options);

        if (this.display.tiny) return;

        if (!this.display.config.webmapEditable) {
            this.disabled = true;
            return;
        }

        this.disabled = false;
    }

    getPluginState(nodeData: LayerItemConfig): PluginState {
        const state = super.getPluginState(nodeData);
        return {
            ...state,
            enabled:
                !this.disabled &&
                nodeData.type === "layer" &&
                (
                    nodeData.plugin[
                        this.identity
                    ] as LayerEditorWebMapPluginConfig
                )?.writable,
            active: nodeData.editable === true,
        };
    }

    async run(nodeData: LayerItemConfig): Promise<undefined> {
        const store = this.display.webmapStore;
        if (nodeData.editable) {
            setItemsEditable(store, [nodeData.id], false);
            const isStillEditing = store.webmapItems.some(
                (item) => item.type === "layer" && item.editable
            );
            if (!isStillEditing) {
                this.display.map.setMapState(null);
            }
        } else {
            setItemsEditable(store, [nodeData.id], true);
            this.display.map.setMapState(EDITING_ID);
        }
    }

    getMenuItem(nodeData: LayerItemConfig): PluginMenuItem {
        const active = nodeData.editable === true;
        const title = active ? gettext("Stop editing") : gettext("Edit");

        return {
            icon: <EditIcon />,
            title,
            onClick: async () => {
                await this.run(nodeData);
            },
        };
    }
}
