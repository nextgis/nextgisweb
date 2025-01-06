/** @entrypoint */
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import PanelsManager from "@nextgisweb/webmap/panels-manager";

import { FeatureHighlighter } from "../feature-highlighter/FeatureHighlighter";
import type { BaseLayer } from "../ol/layer/_Base";
import type { DojoDisplay, PanelDojoItem } from "../type";
import { setURLParam } from "../utils/URL";

import { LoggedDeferred } from "./LoggedDeferred";
import { makePanels } from "./makePanels";

export default class ShadowDisplay {
    private readonly modeURLParam = "panel";
    private readonly emptyModeURLValue = "none";

    constructor(private display: DojoDisplay) {}

    _initializeFeatureHighlighter() {
        return new FeatureHighlighter(this.display.map);
    }

    _initializeMids() {
        const mids = this.display.config.mid;

        const basemapMids: [
            name: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mid: () => Promise<{ default: typeof BaseLayer<any, any, any> }>,
        ][] = [
            [
                "@nextgisweb/webmap/ol/layer/OSM",
                () => import("@nextgisweb/webmap/ol/layer/OSM"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/XYZ",
                () => import("@nextgisweb/webmap/ol/layer/XYZ"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/QuadKey",
                () => import("@nextgisweb/webmap/ol/layer/QuadKey"),
            ],
        ];

        mids.basemap.push(...basemapMids);

        for (const key in mids) {
            const midarr = mids[key as keyof typeof mids];

            const deferred = new LoggedDeferred(`_midDeferred.${key}`);
            this.display._midDeferred[key] = deferred;
            Promise.all(
                midarr.map((m) => {
                    if (Array.isArray(m)) {
                        return m[1]().then((mod) => {
                            return [m[0], mod.default];
                        });
                    } else {
                        return entrypoint<{ default: unknown }>(m).then(
                            (mod) => {
                                return [m, mod.default];
                            }
                        );
                    }
                })
            ).then((mods) => {
                const obj = Object.fromEntries(mods);
                this.display._mid[key] = obj;
                deferred.resolve(obj);
            });
        }
    }

    _buildPanelsManager() {
        const activePanelKey = this.display._urlParams[this.modeURLParam];
        const onChangePanel = (panel?: PanelDojoItem) => {
            if (panel) {
                setURLParam(this.modeURLParam, panel.name);
            } else {
                setURLParam(this.modeURLParam, this.emptyModeURLValue);
            }
        };

        let allowPanels;
        if (this.display.isTinyMode()) {
            allowPanels = this.display._urlParams.panels
                ? this.display._urlParams.panels.split(",")
                : [];
        }

        this.display.panelsManager = new PanelsManager(
            this.display,
            activePanelKey,
            allowPanels,
            onChangePanel
        );

        this._buildPanels();
    }

    private async _buildPanels() {
        await Promise.all([
            this.display._layersDeferred,
            this.display._postCreateDeferred,
        ]);
        try {
            makePanels({ display: this.display });
        } catch (err) {
            console.error(err);
        }
    }
}
