import topic from "dojo/topic";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { PluginBase } from "../PluginBase";

export class FeatureLayerPlugin extends PluginBase {
    getMenuItem() {
        return {
            icon: "material-table",
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

            this.display.tabContainer.addTab({
                key: String(layerId),
                label: item.label,
                component: () =>
                    import("@nextgisweb/webmap/webmap-feature-grid-tab").then(
                        (mod) => ({
                            default: mod.default,
                        })
                    ),
                props: {
                    topic,
                    layerId: layerId,
                    plugin: this,
                },
            });
        }
    }
}
