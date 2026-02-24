import { action, observable, reaction } from "mobx";
import type { Coordinate } from "ol/coordinate";
import {
    boundingExtent,
    containsCoordinate,
    getCenter,
    wrapX,
} from "ol/extent";
import { WKT } from "ol/format";
import { MultiPolygon } from "ol/geom";
import { fromExtent } from "ol/geom/Polygon";
import type Interaction from "ol/interaction/Interaction";

import { route } from "@nextgisweb/pyramid/api/route";
import type { RouteQuery } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { RasterLayerIdentifyResponse } from "@nextgisweb/raster-layer/type/api";
import webmapSettings from "@nextgisweb/webmap/client-settings";
import type { Display } from "@nextgisweb/webmap/display";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type IdentifyStore from "@nextgisweb/webmap/panel/identify/IdentifyStore";
import type {
    FeatureInfo,
    FeatureResponse,
    IdentifyInfo,
    IdentifyResponse,
} from "@nextgisweb/webmap/panel/identify/identification";

const wkt = new WKT();

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
    @observable.ref accessor identifyInfo: IdentifyInfo | null = null;

    constructor(options: IdentifyOptions) {
        this.display = options.display;
        this.map = this.display.map;

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
    clear() {
        this.identifyInfo = null;
        this.display.highlighter.unhighlight();

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

            const featureItem = await route("feature_layer.feature.item", {
                id: featureResponse.layerId,
                fid: featureResponse.id,
            }).get({ query: { dt_format: "iso" }, ...opt });

            this.display.highlighter.highlight({
                geom: featureItem.geom,
                featureId: featureItem.id,
                layerId: featureInfo.layerId,
            });

            return featureItem;
        }
    }

    async identifyFeatureByAttrValue({
        attrValue,
        attrName,
        layerId,
        title,
        zoom,
    }: {
        zoom?: number;
        title?: string;
        layerId: number;
        attrName: string;
        attrValue: string | number;
    }): Promise<boolean> {
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
        layerLabels[responseLayerId] = title ?? layerInfo.resource.display_name;

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

    async execute(pixel: number[], radiusScale?: number): Promise<void> {
        const { olMap, olView } = this.map;
        const point = olMap.getCoordinateFromPixel(pixel);
        const projection = olView.getProjection();

        const projExtent = projection.getExtent();
        // Workaround for identify outside the 180 meridian.
        const outside = projExtent
            ? !containsCoordinate(projExtent, point)
            : false;

        const request: Request = {
            srs: 3857,
            geom: this._requestGeomString(pixel, radiusScale, outside),
            layers: [],
        };

        const items = await this.display.getVisibleItems();

        const rasterLayers: number[] = [];

        items.forEach((item) => {
            const shouldIdentify = item.identifiable && !item.isOutOfScaleRange;

            if (shouldIdentify && item.identification) {
                if (item.identification.mode === "feature_layer") {
                    request.layers.push(item.identification.resource.id);
                } else if (item.identification.mode === "raster_layer") {
                    rasterLayers.push(item.identification.resource.id);
                }
            }
        });

        const layerLabels: Record<number, string | null> = {};
        items.forEach((i) => {
            const layerId = i.layerId;
            layerLabels[layerId] = i.label;
        });

        let features: FeatureResponse | undefined = undefined;
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

    private _requestGeomString(
        pixel: number[],
        radiusScale = 1,
        outside = false
    ): string {
        const olMap = this.map.olMap;
        const radius = this.pixelRadius * radiusScale;
        const bounds = boundingExtent([
            olMap.getCoordinateFromPixel([
                pixel[0] - radius,
                pixel[1] - radius,
            ]),
            olMap.getCoordinateFromPixel([
                pixel[0] + radius,
                pixel[1] + radius,
            ]),
        ]);
        const rangeGeom = fromExtent(bounds);

        if (outside) {
            const projection = olMap.getView().getProjection();
            const wrapped = wrapX(bounds, projection);
            const wrappedPoly = fromExtent(wrapped);

            const multi = new MultiPolygon([
                rangeGeom.getCoordinates(),
                wrappedPoly.getCoordinates(),
            ]);

            return wkt.writeGeometry(multi);
        }

        return wkt.writeGeometry(rangeGeom);
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
        const response: IdentifyResponse = features || { featureCount: 0 };

        if (response.featureCount === 0) {
            this.identifyInfo = null;
            this.display.highlighter.unhighlight();
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
