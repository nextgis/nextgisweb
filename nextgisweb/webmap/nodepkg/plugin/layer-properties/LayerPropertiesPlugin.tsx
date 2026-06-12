import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import { LayerPropertiesModal } from "./LayerPropertiesModal";

import PropertiesIcon from "@nextgisweb/icon/material/tune";

export class LayerPropertiesPlugin extends PluginBase {
  async run(nodeData: TreeLayerStore): Promise<undefined> {
    showModal(LayerPropertiesModal, {
      display: this.display,
      nodeData,
    });
    return undefined;
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    return {
      icon: <PropertiesIcon />,
      title: gettext("Layer properties"),
      order: 120,
      onClick: () => {
        void this.run(nodeData);
      },
    };
  }
}
