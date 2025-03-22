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

    private async initialize(): Promise<void> {
        const wmplugin = this.display.config.webmapPlugin[
            this.identity
        ] as WebmapPluginConfig;

        const basemaps = wmplugin.basemaps.length
            ? wmplugin.basemaps
            : settings.basemaps;

        await this.setBasemapsFromPlugin(basemaps);
        if (this.display.urlParams.base) {
            this.display.map.switchBasemap(this.display.urlParams.base);
        }
    }

    private async setBasemapsFromPlugin(
        basemaps: WebmapPluginBaselayer[] | BasemapConfig[]
    ): Promise<void> {
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
                await addBaselayer({ ...opts, map });
            } catch (err) {
                //
            }
        }

        await addBaselayer({
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
