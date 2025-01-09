import { addCoordinateTransforms, addProjection, getTransform } from "ol/proj";
import * as olProj from "ol/proj";

import { PluginBase } from "@nextgisweb/webmap/plugin/PluginBase";
import type { PluginParams, WebmapPluginConfig } from "@nextgisweb/webmap/type";
import type { WebMapSettings } from "@nextgisweb/webmap/type/WebmapSettings";

const a = 6378137;
const b = 6356752.3142;
const e = Math.sqrt(1 - (b * b) / (a * a));

interface QmsData {
    epsg: number;
    url: string;
    z_min?: number;
    z_max?: number;
    y_origin_top?: boolean;
    copyright_text?: string;
    copyright_url?: string;
}

interface BasemapOptions {
    base: {
        keyname: string;
        mid: string;
    };
    layer: {
        title: string;
        visible: boolean;
        opacity?: number;
        enabled?: boolean;
    };
    source: {
        url?: string;
        minZoom?: number;
        maxZoom?: number;
        projection?: string;
        attributions?: string;
        crossOrigin?: string;
    };
}

function toEPSG3395fromEPSG4326(
    input: number[],
    output?: number[],
    dimension: number = 2
): number[] {
    const length = input.length;

    if (output === undefined) {
        output = dimension > 2 ? input.slice() : new Array(length);
    }

    for (let i = 0; i < length; i += dimension) {
        output[i] = (a * (input[i] * Math.PI)) / 180;
        const phi = (input[i + 1] * Math.PI) / 180;
        const c = Math.pow(
            (1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)),
            e / 2
        );
        output[i + 1] = a * Math.log(Math.tan(Math.PI / 4 + phi / 2) * c);
    }

    return output;
}

function toEPSG3395fromEPSG3857(
    input: number[],
    output?: number[],
    dimension?: number
): number[] {
    const transform = getTransform("EPSG:3857", "EPSG:4326");
    const transformed = transform(input, output, dimension);
    return toEPSG3395fromEPSG4326(transformed, output, dimension);
}

export class BaseMap extends PluginBase {
    constructor(options: PluginParams) {
        super(options);
        this.initialize();
    }

    private initialize(): void {
        const wmplugin = this.display.config.webmapPlugin[
            this.identity
        ] as WebmapPluginConfig;
        const settings = this.display.clientSettings;

        addProjection(
            new olProj.Projection({
                code: "EPSG:3395",
                units: "m",
                extent: [
                    -20037508.342789244, -20037508.342789244,
                    20037508.342789244, 20037508.342789244,
                ],
                getPointResolution: (resolution: number, point: number[]) => {
                    return resolution / Math.cosh(point[1] / a);
                },
            })
        );

        addCoordinateTransforms(
            "EPSG:3857",
            "EPSG:3395",
            toEPSG3395fromEPSG3857,
            (input: number[]) => {
                console.warn("Handle the inverse transform!");
                return input;
            }
        );

        if (wmplugin.basemaps.length) {
            this._setBasemapsFromPlugin(settings, wmplugin);
        }
    }

    private _setBasemapsFromPlugin(
        settings: WebMapSettings,
        wmplugin: WebmapPluginConfig
    ): void {
        settings.basemaps = [];
        let isDefaultExisted = false;

        for (const bm of wmplugin.basemaps) {
            const opts: BasemapOptions = {
                base: {} as BasemapOptions["base"],
                layer: {} as BasemapOptions["layer"],
                source: {} as BasemapOptions["source"],
            };

            let qms: QmsData | undefined;
            let copyright_text: string | null | undefined;
            let copyright_url: string | null | undefined;

            opts.base.keyname = bm.keyname;
            opts.layer.title = bm.display_name;

            if (!bm.qms) {
                opts.source.url = bm.url;
                copyright_text = bm.copyright_text;
                copyright_url = bm.copyright_url;
            } else {
                try {
                    qms = JSON.parse(bm.qms);

                    if (qms) {
                        if (qms.epsg !== 3857 && qms.epsg !== 3395) {
                            console.warn(
                                `CRS ${qms.epsg} is not supported, ${bm.display_name} layer.`
                            );
                            continue;
                        }

                        copyright_text = qms.copyright_text;
                        copyright_url = qms.copyright_url;

                        opts.source = {
                            url: qms.url,
                            minZoom: qms.z_min,
                            maxZoom: qms.z_max,
                            projection: `EPSG:${qms.epsg}`,
                        };
                    }
                } catch (er) {
                    console.log(er);
                }
            }

            if (opts.source.url) {
                opts.source.url = opts.source.url.replace(/\{[XYZQ]\}/g, (c) =>
                    c.toLowerCase()
                );

                if (qms && !qms.y_origin_top) {
                    opts.source.url = opts.source.url.replace("{y}", "{-y}");
                }

                opts.base.mid = opts.source.url.includes("{q}")
                    ? "@nextgisweb/webmap/ol/layer/QuadKey"
                    : "@nextgisweb/webmap/ol/layer/XYZ";
            }

            if (copyright_text) {
                opts.source.attributions = copyright_text;
                if (copyright_url) {
                    opts.source.attributions = `<a href="${copyright_url}">${opts.source.attributions}</a>`;
                }
            }

            opts.layer.opacity = bm.opacity ? bm.opacity : undefined;
            opts.layer.visible = false;
            opts.layer.enabled = bm.enabled;

            if (bm.enabled && !isDefaultExisted) {
                opts.layer.visible = true;
                isDefaultExisted = true;
            }

            opts.source.crossOrigin = "anonymous";

            settings.basemaps.push(opts);
        }

        settings.basemaps.push({
            base: {
                keyname: "blank",
                mid: "@nextgisweb/webmap/ol/layer/XYZ",
            },
            layer: {
                title: "None",
                visible: !isDefaultExisted,
            },
            source: {},
        });
    }
}
