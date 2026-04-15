import { gettext } from "@nextgisweb/pyramid/i18n";
import type DescriptionStore from "@nextgisweb/webmap/panel/description/DescriptionStore";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";
import type { DescriptionWebMapPluginConfig } from "../type";

import DescriptioIcon from "@nextgisweb/icon/material/article";

export class LayerInfoPlugin extends PluginBase {
  data: DescriptionWebMapPluginConfig | null = null;

  getPluginState(nodeData: TreeLayerStore): PluginState {
    const state = super.getPluginState(nodeData);

    const itemFromStore = Object.values(
      this.display.treeStore.filter({
        type: "layer",
        styleId: nodeData.styleId,
      })
    )[0];

    this.data = itemFromStore
      ? (itemFromStore.plugin[this.identity] as DescriptionWebMapPluginConfig)
      : null;

    return {
      ...state,
      enabled: !!(state.enabled && this.data?.description),
    };
  }

  async run() {
    this.openLayerInfo();
    return undefined;
  }

  getMenuItem() {
    return {
      icon: <DescriptioIcon />,
      title: gettext("Description"),
      onClick: () => {
        return this.run();
      },
    };
  }

  private async openLayerInfo() {
    const pm = this.display.panelManager;
    const pkey = "info";
    const data = this.data;

    if (data !== null) {
      const panel = pm.getPanel<DescriptionStore>(pkey);
      if (!panel) {
        const panelPlugin = await pm.registerPlugin(pkey, { force: true });
        if (panelPlugin?.type === "widget") {
          this.openLayerInfo();
        }
      }
      if (panel) {
        panel.setContent(data.description);
      }
      pm.activatePanel(pkey);
    }
  }
}
