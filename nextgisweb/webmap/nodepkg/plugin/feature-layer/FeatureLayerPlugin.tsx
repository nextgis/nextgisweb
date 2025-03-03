import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";

import { PluginBase } from "../PluginBase";

import TableIcon from "@nextgisweb/icon/material/table";

export class FeatureLayerPlugin extends PluginBase {
    getMenuItem() {
        return {
            icon: <TableIcon />,
            title: gettext("Feature table"),
            onClick: () => {
                this.openFeatureGrid();
                return Promise.resolve(undefined);
            },
        };
    }

    private openFeatureGrid() {
        const item = this.display.dumpItem();
        if ("layerId" in item) {
            const layerId = item.layerId;

            this.display.tabsManager.addTab({
                key: String(layerId),
                label: item.label,
                component: () =>
                    import("@nextgisweb/webmap/webmap-feature-grid-tab"),
                props: {
                    topic,
                    layerId: layerId,
                    plugin: this,
                },
            });
        }
    }
}
