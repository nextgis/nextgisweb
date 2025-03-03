import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";

import { PluginBase } from "../PluginBase";

import Icon from "@nextgisweb/icon/material/zoom_in_map";

export class ZoomToLayerPlugin extends PluginBase {
    run(): Promise<undefined> {
        this.zoomToLayer();
        return Promise.resolve(undefined);
    }

    getMenuItem() {
        return {
            icon: <Icon />,
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

                this.display.map.zoomToNgwExtent(extent, {
                    displayProjection: this.display.displayProjection,
                });
            } catch (error) {
                errorModal(error);
            }
        }
    }
}
