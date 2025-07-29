import type { Options as XYZSourceOptions } from "ol/source/XYZ";

import type {
    BasemapConfig,
    QMSService,
    WebmapPluginBaselayer,
} from "@nextgisweb/basemap/layer-widget/type";
import { registerEPSG3395Projection } from "@nextgisweb/basemap/util/epsg3395";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type { LayerOptions } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type QuadKey from "@nextgisweb/webmap/ol/layer/QuadKey";
import type XYZ from "@nextgisweb/webmap/ol/layer/XYZ";

import { DEFAULT_MAX_ZOOM } from "../constant";

let idx = 0;

export function prepareBaselayerConfig(
    config: WebmapPluginBaselayer | BasemapConfig
) {
    const layer = {} as LayerOptions;
    let source = {} as XYZSourceOptions;

    let qms: QMSService | undefined;
    let copyright_text: string | null | undefined;
    let copyright_url: string | null | undefined;

    const keyname = "keyname" in config ? config.keyname : undefined;
    layer.title = config.display_name;

    if ("qms" in config && config.qms) {
        try {
            qms = JSON.parse(config.qms);

            if (qms) {
                if (qms.epsg !== 3857 && qms.epsg !== 3395) {
                    console.warn();
                    throw new Error(
                        `CRS ${qms.epsg} is not supported, ${config.display_name} layer.`
                    );
                }

                copyright_text = qms.copyright_text;
                copyright_url = qms.copyright_url;

                source = {
                    url: qms.url,
                    minZoom: qms.z_min,
                    maxZoom: qms.z_max,
                    projection: `EPSG:${qms.epsg}`,
                };
            }
        } catch (err) {
            console.log(err);
        }
    } else if (config.url) {
        source.url = config.url;
        copyright_text = config.copyright_text;
        copyright_url = config.copyright_url;

        if ("epsg" in config && config.epsg) {
            source.projection = `EPSG:${config.epsg}`;
        }
    }

    if (source.url) {
        source.url = source.url.replace(/\{[XYZQ]\}/g, (c) => c.toLowerCase());

        if (qms && !qms.y_origin_top) {
            source.url = source.url.replace("{y}", "{-y}");
        }
    }
    if (source.projection === "EPSG:3395") {
        registerEPSG3395Projection();
    }

    if (copyright_text) {
        source.attributions = copyright_text;
        if (copyright_url) {
            source.attributions = `<a href="${copyright_url}">${source.attributions}</a>`;
        }
    }

    if ("z_min" in config && typeof config.z_min === "number") {
        source.minZoom = config.z_min;
    }
    if ("z_max" in config && typeof config.z_max === "number") {
        source.maxZoom = config.z_max;
    }

    if (source.maxZoom === undefined) {
        source.maxZoom = DEFAULT_MAX_ZOOM;
    }

    if (source.minZoom !== undefined) {
        // Put minZoom in layer options (not source options, as with maxZoom) to avoid triggering
        // an avalanche of high‑zoom tiles when zoomed out. Below this zoom, the layer is simply
        // hidden instead of trying to fetch zoom‑18 tiles at zoom‑0, for example.
        // Although this differs from maxZoom’s upscaling behavior, but it makes the map more stable
        // and since minZoom is realy rarely used, it shouldn't cause any problems.
        layer.minZoom = source.minZoom;
        delete source.minZoom;
    }

    layer.opacity = config.opacity ? config.opacity : undefined;
    layer.visible = config.enabled;

    source.crossOrigin = "anonymous";
    return { source, layer, keyname };
}

export async function createTileLayer({
    source,
    layer: layerOptions,
    keyname,
}: {
    source: XYZSourceOptions;
    layer?: LayerOptions;
    keyname?: string;
}): Promise<QuadKey | XYZ | undefined> {
    if (!keyname) {
        keyname = `basemap_${idx++}`;
    }

    try {
        const MID = source.url?.includes("{q}")
            ? (await import("@nextgisweb/webmap/ol/layer/QuadKey")).default
            : (await import("@nextgisweb/webmap/ol/layer/XYZ")).default;

        const layer = new MID(keyname, layerOptions, source);

        return layer as QuadKey | XYZ;
    } catch (err) {
        console.warn(`Can't initialize layer [${keyname}]: ${err}`);
    }
}

export async function addBaselayer({
    map,
    ...layerOptions
}: {
    source: XYZSourceOptions;
    layer?: LayerOptions;
    keyname?: string;
    map: MapStore;
}): Promise<QuadKey | XYZ | undefined> {
    const layer = await createTileLayer(layerOptions);
    if (layer) {
        if (layer.olLayer.getVisible()) {
            map.setBaseLayer(layer);
        }
        layer.isBaseLayer = true;
        map.addLayer(layer);
        return layer as QuadKey | XYZ;
    }
}

export async function addBasemaps(
    basemaps: WebmapPluginBaselayer[] | BasemapConfig[],
    map: MapStore
): Promise<(QuadKey | XYZ)[]> {
    let isDefaultExisted = false;
    const layers: (QuadKey | XYZ)[] = [];
    for (const { ...bm } of basemaps) {
        try {
            if (bm.enabled && !isDefaultExisted) {
                isDefaultExisted = true;
            } else {
                bm.enabled = false;
            }

            const opts = prepareBaselayerConfig(bm);
            const layer = await addBaselayer({ ...opts, map });
            if (layer) {
                layers.push(layer);
            }
        } catch {
            //
        }
    }

    const blankLayer = await addBaselayer({
        map,
        layer: {
            title: "None",
            visible: !isDefaultExisted,
        },
        source: {},
        keyname: "blank",
    });
    if (blankLayer) {
        layers.push(blankLayer);
    }
    return layers;
}
