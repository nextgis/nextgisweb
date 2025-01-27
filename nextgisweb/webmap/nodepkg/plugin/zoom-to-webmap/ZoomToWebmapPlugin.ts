import { route } from "@nextgisweb/pyramid/api";

import { PluginBase } from "../PluginBase";

export class ZoomToWebmapPlugin extends PluginBase {
    zoomToAllLayers() {
        const webmapId = this.display.config.webmapId;
        route("webmap.extent", webmapId)
            .get()
            .then((extent) => {
                if (!extent) return;
                this.display.map.zoomToNgwExtent(extent, {
                    displayProjection: this.display.displayProjection,
                });
            });
    }
}
