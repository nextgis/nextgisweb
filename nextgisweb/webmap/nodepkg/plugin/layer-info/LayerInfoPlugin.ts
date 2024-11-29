import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PluginState } from "@nextgisweb/webmap/type";
import type { LayerItem } from "@nextgisweb/webmap/type/TreeItems";
import reactPanel from "@nextgisweb/webmap/ui/react-panel";

import { PluginBase } from "../PluginBase";

export class LayerInfoPlugin extends PluginBase {
    getPluginState(nodeData: LayerItem): PluginState {
        const state = super.getPluginState(nodeData);
        const infoConfig = this.display.get("itemConfig");
        const data = infoConfig.plugin[this.identity];
        return {
            ...state,
            enabled: state.enabled && data.description,
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
        const pkey = "resource-description";
        const item = this.display.dumpItem();
        const data = this.display.get("itemConfig").plugin[this.identity];
        if (data !== undefined) {
            const content = data.description;
            let panel = pm.getPanel(pkey);
            if (panel) {
                if (panel.app) {
                    panel.app.update({ content });
                } else {
                    panel.props = { content };
                }
            } else {
                const cls = reactPanel(
                    () => import("@nextgisweb/webmap/panel/description"),
                    {
                        props: { content },
                    }
                );
                pm.addPanels([
                    {
                        cls,
                        params: {
                            title: item.label,
                            name: pkey,
                            order: 100,
                            menuIcon: "material-article",
                        },
                    },
                ]);
                panel = pm.getPanel(pkey);
            }
            pm.activatePanel(pkey);
        }
    }
}
