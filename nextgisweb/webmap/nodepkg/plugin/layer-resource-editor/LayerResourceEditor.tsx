import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import { LayerResourceEditorModal } from "./LayerResourceEditorModal";

import EditIcon from "@nextgisweb/icon/material/settings";

export class LayerResourceEditor extends PluginBase {
  async run(nodeData: TreeLayerStore): Promise<undefined> {
    showModal(LayerResourceEditorModal, {
      display: this.display,
      nodeData,
    });
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    const hasStyle = nodeData.styleId !== nodeData.layerId;
    const title = hasStyle
      ? gettext("Edit layer resource")
      : gettext("Edit resource");

    return {
      icon: <EditIcon />,
      title,
      order: 110,
      onClick: async () => {
        await this.run(nodeData);
      },
    };
  }
}
