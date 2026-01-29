import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

import { PluginBase } from "../PluginBase";

import TableIcon from "@nextgisweb/icon/material/table";

export class FeatureLayerPlugin extends PluginBase {
    getMenuItem(nodeData: TreeLayerStore) {
        return {
            icon: <TableIcon />,
            title: gettext("Feature table"),
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
                component: () =>
                    import("@nextgisweb/webmap/webmap-feature-grid-tab"),
                props: {
                    topic,
                    item,
                    plugin: this,
                },
            });
        }
    }
}
