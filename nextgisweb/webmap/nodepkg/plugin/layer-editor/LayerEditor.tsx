import { lazy } from "react";

import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { EDITING_ID } from "@nextgisweb/webmap/constant";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem, PluginState } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";
import type { LayerEditorWebMapPluginConfig } from "../type";

import { setItemsEditable } from "./util/setItemsEditable";

const LayerEditorMapLazy = lazy(() => import("./LayerEditorMap"));

export class LayerEditor extends PluginBase {
  renderMap = LayerEditorMapLazy;

  getPluginState(nodeData: TreeLayerStore): PluginState {
    const state = super.getPluginState(nodeData);
    const disabled =
      this.display.isTinyMode || !this.display.config.webmapEditable;

    return {
      ...state,
      enabled:
        !disabled &&
        nodeData.type === "layer" &&
        (nodeData.plugin[this.identity] as LayerEditorWebMapPluginConfig)
          ?.writable,
      active: nodeData.editable === true,
    };
  }

  async run(nodeData: TreeLayerStore): Promise<undefined> {
    const store = this.display.treeStore;
    if (nodeData.editable) {
      setItemsEditable(store, [nodeData.id], false);
      const isStillEditing = store.filter({
        "type": "layer",
        "editable": true,
      }).length;
      if (!isStillEditing) {
        this.display.map.setMapState(null);
      }
    } else {
      setItemsEditable(store, [nodeData.id], true);
      this.display.map.setMapState(EDITING_ID);
    }
  }

  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    const active = nodeData.editable === true;
    const title = active ? gettext("Stop editing") : gettext("Edit");

    return {
      icon: <EditIcon />,
      title,
      onClick: async () => {
        await this.run(nodeData);
      },
    };
  }
}
