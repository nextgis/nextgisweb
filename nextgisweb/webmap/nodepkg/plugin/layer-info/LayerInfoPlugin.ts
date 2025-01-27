import { gettext } from "@nextgisweb/pyramid/i18n";
import type DescriptionStore from "@nextgisweb/webmap/panel/description/DescriptionStore";
import type { PluginState } from "@nextgisweb/webmap/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { PluginBase } from "../PluginBase";
import type { DescriptionWebMapPluginConfig } from "../type";

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
        const pm = this.display.panelManager;
        const pkey = "info";
        const data = this.display.itemConfig?.plugin[
            this.identity
        ] as DescriptionWebMapPluginConfig;
        if (data !== undefined) {
            const panel = pm.getPanel<DescriptionStore>(pkey);
            if (panel) {
                panel.setContent(data.description);
            }
            pm.activatePanel(pkey);
        }
    }
}
