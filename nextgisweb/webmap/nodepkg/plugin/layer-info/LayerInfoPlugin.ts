import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PluginState } from "@nextgisweb/webmap/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/TreeItems";

import { PluginBase } from "../PluginBase";
import type { DescriptionWebMapPluginConfig } from "../type";
import { PanelPlugin } from "@nextgisweb/webmap/panels-manager/registry";
import { DescriptionPanelProps } from "@nextgisweb/webmap/panel/description/DescriptionPanel";

export class LayerInfoPlugin extends PluginBase {
    getPluginState(nodeData: LayerItemConfig): PluginState {
        const state = super.getPluginState(nodeData);
        const infoConfig = this.display.itemConfig;
        const data = infoConfig?.plugin[
            this.identity
        ] as DescriptionWebMapPluginConfig;
        return {
            ...state,
            enabled: !!(state.enabled && data.description),
        };
    }

    async run() {
        this.openLayerInfo();
        return undefined;
    }

    getMenuItem() {
        return {
            icon: "material-article",
            title: gettext("Description"),
            onClick: () => {
                return this.run();
            },
        };
    }

    openLayerInfo() {
        const pm = this.display.panelsManager;
        const pkey = "info";
        const data = this.display.itemConfig?.plugin[
            this.identity
        ] as DescriptionWebMapPluginConfig;
        if (data !== undefined) {
            const content = data.description;
            const panel = pm.getPanel(
                pkey
            ) as PanelPlugin<DescriptionPanelProps>;
            if (panel) {
                panel.updateMeta({ content });
            }
            pm.activatePanel(pkey);
        }
    }
}
