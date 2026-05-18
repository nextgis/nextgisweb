import { EditIcon } from "@nextgisweb/gui/icon";
import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import { ResourceEditorModal } from "./ResourceEditorModal";

export class ResourceEditor extends PluginBase {
  getPluginState(nodeData: TreeLayerStore): PluginState {
    const stat = super.getPluginState(nodeData);
    stat.enabled = stat.enabled && !!nodeData.identification;
    return stat;
  }

  async run(nodeData: TreeLayerStore): Promise<undefined> {
    showModal(ResourceEditorModal, {
      display: this.display,
      nodeData,
    });
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    const title = gettext("Update resource");

    return {
      icon: <EditIcon />,
      title,
      onClick: async () => {
        await this.run(nodeData);
      },
    };
  }
}
