import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";

import { PluginBase } from "../PluginBase";

export class ZoomToLayerPlugin extends PluginBase {
    run(): Promise<void> {
        this.zoomToLayer();
        return Promise.resolve();
    }

    getMenuItem() {
        return {
            icon: "material-zoom_in_map",
            title: i18n.gettext("Zoom to layer"),
            onClick: () => {
                this.run();
            },
        };
    }

    private async zoomToLayer(): Promise<void> {
        const item = this.display.dumpItem();
        if ("styleId" in item) {
            try {
                const { extent } = await route("layer.extent", {
                    id: item.styleId,
                }).get({ cache: true });

                this.display.map.zoomToNgwExtent(
                    extent,
                    this.display.displayProjection
                );
            } catch (error) {
                errorModal(error);
            }
        }
    }
}
