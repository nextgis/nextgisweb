import type { MapBrowserEvent } from "ol";
import type { Coordinate } from "ol/coordinate";
import { boundingExtent, getCenter } from "ol/extent";
import { WKT } from "ol/format";
import { fromExtent } from "ol/geom/Polygon";
import Interaction from "ol/interaction/Interaction";

import { route } from "@nextgisweb/pyramid/api/route";
import type { RouteQuery, RouteResp } from "@nextgisweb/pyramid/api/type";
import i18n from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { Map } from "@nextgisweb/webmap/ol/Map";
import type {
    IdentificationPanelProps,
    IdentifyInfo,
} from "@nextgisweb/webmap/panel/identification/identification";
import type { PanelPlugin } from "@nextgisweb/webmap/panels-manager/registry";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import { ToolBase } from "./ToolBase";

import "./Identify.css";

const wkt = new WKT();

interface ControlOptions {
    tool: Identify;
}

class Control extends Interaction {
    private tool: Identify;

    constructor(options: ControlOptions) {
        super({
            handleEvent: (evt) => this.handleClickEvent(evt),
        });
        this.tool = options.tool;
    }

    handleClickEvent(evt: MapBrowserEvent<UIEvent>): boolean {
        if (evt.type === "singleclick") {
            this.tool.execute(evt.pixel);
            evt.preventDefault();
        }
        return true;
    }
}

interface IdentifyOptions {
    display: Display;
}

interface Request {
    srs: number;
    geom: string;
    layers: number[];
}

export class Identify extends ToolBase {
    label = i18n.gettext("Identify");
    iconClass = "iconIdentify";
    pixelRadius: number = webmapSettings.identify_radius || 10;
    map: Map;
    control: Control;

    constructor(options: IdentifyOptions) {
        super(options);

        this.map = this.display.map;

        this.control = new Control({ tool: this });
        this.control.setActive(false);
        this.display.map.olMap.addInteraction(this.control);

        this._bindEvents();
    }

    activate(): void {
        this.control.setActive(true);
    }

    deactivate(): void {
        this.control.setActive(false);
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

        const identifyResponse = {
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

        const layerLabel: Record<number, string> = {};
        layerLabel[responseLayerId] = layerInfo.resource.display_name;

        this.openIdentifyPanel(identifyResponse, center, layerLabel);

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
        const olMap = this.display.map.olMap;
        const point = olMap.getCoordinateFromPixel(pixel);

        const request: Request = {
            srs: 3857,
            geom: this._requestGeomString(pixel),
            layers: [],
        };

        const items = await this.display.getVisibleItems();
        const mapResolution = this.display.map.resolution;

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
                request.layers.push(item.layerId);
            }
        });

        const layerLabels: Record<number, string | null> = {};
        items.forEach((i) => {
            const layerId = this.display.itemStore.getValue(i, "layerId");

            layerLabels[layerId] = this.display.itemStore.getValue(i, "label");
        });

        const response = await route("feature_layer.identify").post({
            json: request,
        });

        this.openIdentifyPanel(response, point, layerLabels);
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

    private openIdentifyPanel(
        response: RouteResp<"feature_layer.identify", "post">,
        point: Coordinate,
        layerLabels: Record<string, string | null>
    ): void {
        if (response.featureCount === 0) {
            topic.publish("feature.unhighlight");
        }

        const identifyInfo: IdentifyInfo = {
            point,
            response,
            layerLabels,
        };

        const pm = this.display.panelsManager;
        const pkey = "identify";
        const panel = pm.getPanel(pkey) as PanelPlugin<
            Partial<IdentificationPanelProps>
        >;
        if (panel) {
            panel.updateMeta({ identifyInfo, key: point.toString() });
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
