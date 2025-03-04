import settings from "@nextgisweb/basemap/client-settings";
import type {
    BasemapConfig,
    WebmapPluginBaselayer,
    WebmapPluginConfig,
} from "@nextgisweb/basemap/layer-widget/type";
import {
    addBaselayer,
    prepareBaselayerConfig,
} from "@nextgisweb/basemap/util/baselayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PluginBase } from "@nextgisweb/webmap/plugin/PluginBase";
import type { PluginParams } from "@nextgisweb/webmap/type";

export class BaseMap extends PluginBase {
    constructor(options: PluginParams) {
        super(options);
        this.initialize();
    }

    private initialize(): void {
        const wmplugin = this.display.config.webmapPlugin[
            this.identity
        ] as WebmapPluginConfig;

        const basemaps = wmplugin.basemaps.length
            ? wmplugin.basemaps
            : settings.basemaps;

        this.setBasemapsFromPlugin(basemaps);
    }

    private setBasemapsFromPlugin(
        basemaps: WebmapPluginBaselayer[] | BasemapConfig[]
    ): void {
        let isDefaultExisted = false;
        const map = this.display.map;
        for (const { ...bm } of basemaps) {
            try {
                if (bm.enabled && !isDefaultExisted) {
                    isDefaultExisted = true;
                } else {
                    bm.enabled = false;
                }

                const opts = prepareBaselayerConfig(bm);
                addBaselayer({ ...opts, map });
            } catch (er) {
                //
            }
        }

        addBaselayer({
            map,
            layer: {
                title: gettext("No basemap"),
                visible: !isDefaultExisted,
            },
            source: {},
            keyname: "blank",
        });
    }
}
