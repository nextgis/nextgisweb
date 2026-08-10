import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import type { PluginMenuItem } from "@nextgisweb/webmap/type";

import { PluginBase } from "../PluginBase";

import TableIcon from "@nextgisweb/icon/material/table";

const webmapFeatureGridTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-feature-grid-tab")
);

export class FeatureLayerPlugin extends PluginBase {
  getMenuItem(nodeData: TreeLayerStore): PluginMenuItem {
    return {
      icon: <TableIcon />,
      title: gettext("Feature table"),
      order: 30,
      onClick: () => {
        this.openFeatureGrid(nodeData);
        return Promise.resolve(undefined);
      },
    };
  }

  private openFeatureGrid(item: TreeLayerStore) {
    if (item?.isLayer()) {
      this.display.tabsManager.addTab({
        key: String(item.styleId),
        label: item.label,
        component: webmapFeatureGridTabLazy,
        props: {
          topic,
          item,
          plugin: this,
        },
      });
    }
  }
}
