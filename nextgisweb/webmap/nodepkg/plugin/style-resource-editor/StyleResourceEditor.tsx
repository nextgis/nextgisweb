import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import { StyleResourceEditorModal } from "./StylerResourceEditorModal";

import EditIcon from "@nextgisweb/icon/material/palette";

export class StyleResourceEditor extends PluginBase {
  getPluginState(nodeData: TreeLayerStore): PluginState {
    const state = super.getPluginState(nodeData);
    const hasStyle = nodeData.styleId !== nodeData.layerId;
    return {
      ...state,
      enabled: hasStyle,
    };
  }

  async run(nodeData: TreeLayerStore): Promise<undefined> {
    showModal(StyleResourceEditorModal, {
      display: this.display,
      nodeData,
    });
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    const title = gettext("Edit style resource");

    return {
      icon: <EditIcon />,
      title,
      order: 100,
      onClick: () => {
        this.run(nodeData);
      },
    };
  }
}
