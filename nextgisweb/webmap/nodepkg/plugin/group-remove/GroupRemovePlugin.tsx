import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeGroupStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import RemoveIcon from "@nextgisweb/icon/material/close";

export class GroupRemovePlugin extends PluginBase<TreeGroupStore> {
  type = "group" as const;

  async run(nodeData: TreeGroupStore): Promise<undefined> {
    this.display.treeStore.deleteItem(nodeData.id);
  }

  getMenuItem(nodeData: TreeGroupStore): PluginMenuItem {
    return {
      icon: <RemoveIcon />,
      title: gettext("Remove group"),
      order: 200,
      onClick: () => {
        this.run(nodeData);
      },
    };
  }
}
