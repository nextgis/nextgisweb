import { lazy } from "react";

import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeGroupStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import PropertiesIcon from "@nextgisweb/icon/material/tune";

const GroupPropertiesModalLazy = lazy(() => import("./GroupPropertiesModal"));

export class GroupPropertiesPlugin extends PluginBase<TreeGroupStore> {
  type = "group" as const;

  async run(nodeData: TreeGroupStore): Promise<undefined> {
    showModal(GroupPropertiesModalLazy, {
      nodeData,
    });
    return undefined;
  }

  getMenuItem(nodeData: TreeGroupStore): PluginMenuItem {
    return {
      icon: <PropertiesIcon />,
      title: gettext("Group properties"),
      order: 120,
      onClick: () => {
        void this.run(nodeData);
      },
    };
  }
}
