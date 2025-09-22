import { action, observable, reaction } from "mobx";
import type { Coordinate } from "ol/coordinate";
import { boundingExtent, getCenter } from "ol/extent";
import { WKT } from "ol/format";
import { fromExtent } from "ol/geom/Polygon";
import type Interaction from "ol/interaction/Interaction";

import { route } from "@nextgisweb/pyramid/api/route";
import type { RouteQuery } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { RasterLayerIdentifyResponse } from "@nextgisweb/raster-layer/type/api";
import webmapSettings from "@nextgisweb/webmap/client-settings";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type IdentifyStore from "@nextgisweb/webmap/panel/identify/IdentifyStore";
import type {
    FeatureHighlightEvent,
    FeatureInfo,
    FeatureResponse,
    IdentifyInfo,
    IdentifyResponse,
} from "@nextgisweb/webmap/panel/identify/identification";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

const wkt = new WKT();
// shortcut
type FHE = FeatureHighlightEvent;

interface IdentifyOptions {
    display: Display;
}

interface Request {
    srs: number;
    geom: string;
    layers: number[];
}

export class Identify {
    label = gettext("Identify");
    iconClass = "iconIdentify";
    pixelRadius: number = webmapSettings.identify_radius || 10;

    map: MapStore;
    display: Display;

    @observable.ref accessor active = true;
    @observable.ref accessor control: Interaction | null = null;
    @observable.shallow accessor identifyInfo: IdentifyInfo | null = null;
    @observable.shallow accessor highlightedFeature: FHE | null = null;

    constructor(options: IdentifyOptions) {
        this.display = options.display;
        this.map = this.display.map;

        this._bindEvents();

        reaction(
            () => this.control,
            (ctrl, prev) => {
                const olMap = this.display.map.olMap;
                if (prev) {
                    olMap.removeInteraction(prev);
                }
                if (ctrl) {
                    olMap.addInteraction(ctrl);
                    ctrl.setActive(this.active);
                }
            },
            { fireImmediately: false }
        );

        reaction(
            () => this.active,
            (isActive) => {
                if (this.control) {
                    this.control.setActive(isActive);
                }
            }
        );
    }

    @action.bound
    setControl(control: Interaction | null) {
        this.control = control;
    }

    @action.bound
    activate(): void {
        this.active = true;
    }

    deactivate(): void {
        this.active = false;
    }

    @action.bound
    setHighlightedFeature(highlightedFeature: FeatureHighlightEvent | null) {
        this.highlightedFeature = highlightedFeature;
    }

    @action.bound
    clear() {
        this.highlightedFeature = null;
        this.identifyInfo = null;
        topic.publish("feature.unhighlight");

        const pm = this.display.panelManager;
        const pkey = "identify";
        const panel = pm.getPanel<IdentifyStore>(pkey);
        if (panel) {
            panel.setIdentifyInfo(undefined);
        }
    }

    async highlightFeature(
        identifyInfo: IdentifyInfo,
        featureInfo: FeatureInfo,
        opt: { signal: AbortSignal }
    ) {
        const layerResponse = identifyInfo.response[featureInfo.layerId];

        if ("features" in layerResponse) {
            const featureResponse = layerResponse.features[featureInfo.idx];
            this.setHighlightedFeature(null);
            const featureItem = await route("feature_layer.feature.item", {
                id: featureResponse.layerId,
                fid: featureResponse.id,
            }).get({ query: { dt_format: "iso" }, ...opt });

            const { label } = featureInfo;

            const featureHightlight: FeatureHighlightEvent = {
                geom: featureItem.geom,
                featureId: featureItem.id,
                layerId: featureInfo.layerId,
                featureInfo: { ...featureItem, labelWithLayer: label },
            };
            this.setHighlightedFeature(featureHightlight);

            topic.publish<FeatureHighlightEvent>(
                "feature.highlight",
                featureHightlight
            );

            return featureItem;
        }
    }

    async identifyFeatureByAttrValue(
        layerId: number,
        attrName: string,
        attrValue: string | number,
        zoom?: number
    ): Promise<boolean> {
        const layerInfo = await route("resource.item", {
            id: layerId,
        }).get();

        const query: RouteQuery<"feature_layer.feature.collection", "get"> & {
            [key: `fld_${string}`]: string | number;
        } = {
            limit: 1,
            dt_format: "iso",
        };
        query[`fld_${attrName}__eq`] = attrValue;

        const features = await route("feature_layer.feature.collection", {
            id: layerId,
        }).get({ query });

        if (features.length !== 1) {
            return false;
        }

        const foundFeature = features[0];
        const responseLayerId = layerInfo.resource.id;

        const identifyResponse: FeatureResponse = {
            featureCount: 1,
            [responseLayerId]: {
                featureCount: 1,
                features: [
                    {
                        fields: foundFeature.fields,
                        id: foundFeature.id,
                        label: "",
                        layerId: responseLayerId,
                    },
                ],
            },
        };

        const geometry = wkt.readGeometry(foundFeature.geom);
        const extent = geometry.getExtent();
        const center = getCenter(extent);

        const layerLabels: Record<number, string> = {};
        layerLabels[responseLayerId] = layerInfo.resource.display_name;

        this.openIdentifyPanel({
            features: identifyResponse,
            point: center,
            layerLabels,
        });

        if (zoom) {
            const view = this.map.olMap.getView();
            view.setCenter(center);
            view.setZoom(zoom);
        } else {
            this.map.zoomToExtent(extent);
        }
        return true;
    }

    async execute(pixel: number[]): Promise<void> {
        const olMap = this.map.olMap;
        const point = olMap.getCoordinateFromPixel(pixel);

        const request: Request = {
            srs: 3857,
            geom: this._requestGeomString(pixel),
            layers: [],
        };

        const items = await this.display.getVisibleItems();
        const mapResolution = this.map.resolution;

        const rasterLayers: number[] = [];

        items.forEach((i) => {
            const item = this.display._itemConfigById[
                this.display.itemStore.getValue(i, "id")
            ] as LayerItemConfig;

            if (
                mapResolution === null ||
                !(
                    !item.identifiable ||
                    (item.maxResolution !== null &&
                        mapResolution >= item.maxResolution) ||
                    (item.minResolution !== null &&
                        mapResolution < item.minResolution)
                )
            ) {
                if (item.identification) {
                    if (item.identification.mode === "feature_layer") {
                        request.layers.push(item.identification.resource.id);
                    } else if (item.identification.mode === "raster_layer") {
                        rasterLayers.push(item.identification.resource.id);
                    }
                }
            }
        });

        const layerLabels: Record<number, string | null> = {};
        items.forEach((i) => {
            const layerId = this.display.itemStore.getValue(i, "layerId");

            layerLabels[layerId] = this.display.itemStore.getValue(i, "label");
        });

        let features;
        if (request.layers.length) {
            features = await route("feature_layer.identify").post({
                json: request,
            });
        }
        let raster: RasterLayerIdentifyResponse | undefined;
        if (rasterLayers.length) {
            const [x, y] = olMap.getCoordinateFromPixel([pixel[0], pixel[1]]);
            raster = await route("raster_layer.identify").get({
                query: { resources: rasterLayers, x, y },
            });
        }

        this.openIdentifyPanel({ features, point, layerLabels, raster });
    }

    private _bindEvents(): void {
        topic.subscribe("webmap/tool/identify/on", () => {
            this.activate();
        });

        topic.subscribe("webmap/tool/identify/off", () => {
            this.deactivate();
        });
    }

    private _requestGeomString(pixel: number[]): string {
        const olMap = this.map.olMap;
        const bounds = boundingExtent([
            olMap.getCoordinateFromPixel([
                pixel[0] - this.pixelRadius,
                pixel[1] - this.pixelRadius,
            ]),
            olMap.getCoordinateFromPixel([
                pixel[0] + this.pixelRadius,
                pixel[1] + this.pixelRadius,
            ]),
        ]);

        return new WKT().writeGeometry(fromExtent(bounds));
    }

    @action.bound
    private openIdentifyPanel({
        features,
        point,
        layerLabels,
        raster,
    }: {
        features?: FeatureResponse;

        point: Coordinate;
        layerLabels: Record<string, string | null>;
        raster?: RasterLayerIdentifyResponse;
    }): void {
        this.highlightedFeature = null;

        const response: IdentifyResponse = features || { featureCount: 0 };

        if (response.featureCount === 0) {
            this.identifyInfo = null;
            topic.publish("feature.unhighlight");
        }

        if (raster) {
            for (const item of raster.items) {
                response[item.resource.id] = item;
                response.featureCount += 1;
            }
        }

        const identifyInfo: IdentifyInfo = {
            point,
            response,
            layerLabels,
        };

        this.identifyInfo = identifyInfo;

        const pm = this.display.panelManager;
        const pkey = "identify";
        const panel = pm.getPanel<IdentifyStore>(pkey);
        if (panel) {
            panel.setIdentifyInfo(identifyInfo);
        } else {
            throw new Error(
                "Identification panel should add during Display initialization"
            );
        }

        const activePanel = pm.getActivePanelName();
        if (activePanel !== pkey) {
            pm.activatePanel(pkey);
        }
    }
}
