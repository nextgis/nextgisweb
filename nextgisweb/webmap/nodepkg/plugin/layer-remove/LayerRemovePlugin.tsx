import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import RemoveIcon from "@nextgisweb/icon/material/close";

export class LayerRemovePlugin extends PluginBase {
  async run(nodeData: TreeLayerStore): Promise<undefined> {
    this.display.treeStore.deleteItem(nodeData.id);
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    const title = gettext("Remove layer");

    return {
      icon: <RemoveIcon />,
      title,
      onClick: () => {
        this.run(nodeData);
      },
    };
  }
}
