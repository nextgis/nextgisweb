import { action, computed, observable, runInAction } from "mobx";
import type { Feature } from "ol";
import OlMap from "ol/Map";
import type { MapOptions as OlMapOptions } from "ol/Map";
import View from "ol/View";
import type { FitOptions } from "ol/View";
import type Control from "ol/control/Control";
import * as olExtent from "ol/extent";
import type { Extent } from "ol/extent";
import * as olProj from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { imageQueue } from "@nextgisweb/pyramid/util";

import { Watchable } from "../compat/Watchable";
import type {
    ControlPosition,
    CreateControlOptions,
    MapControl,
} from "../control-container/ControlContainer";

import { createButtonControl } from "./control/createButtonControl";
import type { ButtonControlOptions } from "./control/createButtonControl";
import { createControl } from "./control/createControl";
import type { CoreLayer, ExtendedOlLayer } from "./layer/CoreLayer";
import { PanelControl } from "./panel-control/PanelControl";
import { mapStartup } from "./util/mapStartup";

import "ol/ol.css";

interface MapOptions extends OlMapOptions {
    logo?: boolean;
    extent?: Extent;
}

export interface Position {
    zoom: number;
    center: number[];
}

interface Layers {
    [key: string]: CoreLayer;
}

interface MapWatchableProps {
    resolution: number | null;
    center: number[] | null;
    position: Position | null;
    zoom: number | null;
}

export class MapStore extends Watchable<MapWatchableProps> {
    private readonly DPI = 1000 / 39.37 / 0.28;
    private readonly IPM = 39.37;
    private readonly SMART_ZOOM_EXTENT = 100;
    private readonly SMART_ZOOM = 12;

    private readonly _panelControl: PanelControl;

    readonly olMap: OlMap;
    @observable.shallow accessor layers: Layers = {};

    @observable.shallow accessor baseLayer: CoreLayer | null = null;
    @observable.ref accessor resolution: number | null = null;
    @observable.struct accessor center: number[] | null = null;
    @observable.ref accessor zoom: number | null = null;
    @observable.struct accessor position: Position | null = null;

    constructor(private options: MapOptions) {
        super();
        const { target, extent, ...rest } = this.options;
        const view = new View({
            minZoom: 3,
            maxZoom: 22,
            constrainResolution: true,
            extent,
        });
        this.olMap = new OlMap({ ...rest, view });
        this._panelControl = new PanelControl();
        this.olMap.addControl(this._panelControl);
        if (target) {
            this.startup(target);
        }
    }

    @computed
    get activeBasemapKey(): "blank" | string {
        if (!this.baseLayer || !this.baseLayer.name) {
            return "blank";
        }
        return this.baseLayer.name;
    }

    @action
    setBaseLayer(layer: CoreLayer) {
        this.baseLayer = layer;
    }

    @action
    switchBasemap = (basemapLayerKey: string) => {
        if (!(basemapLayerKey in this.layers)) {
            return false;
        }

        if (this.baseLayer && this.baseLayer.name) {
            const { name } = this.baseLayer;
            this.layers[name].olLayer.setVisible(false);
        }

        const newLayer = this.layers[basemapLayerKey];
        newLayer.olLayer.setVisible(true);
        this.baseLayer = newLayer;

        return true;
    };

    async startup(target: string | HTMLElement): Promise<void> {
        return new Promise((resolve) => {
            const olMap = this.olMap;
            olMap.setTarget(target);
            const olView = olMap.getView();

            olView.on("change:resolution", () => {
                runInAction(() => {
                    this.setResolution(olView.getResolution() ?? null);
                });
            });

            olView.on("change:center", () => {
                runInAction(() => {
                    this.setCenter(olView.getCenter() ?? null);
                });
            });

            olMap.on("moveend", () => {
                this.setPosition(this.getPosition());
            });
            // Workaround to skip first map move event on start
            olMap.once("movestart", () => {
                // Map ready only then first move happend
                resolve();
                mapStartup({ olMap, queue: imageQueue });
            });
        });
    }

    getLayersArray() {
        return this.olMap.getLayers().getArray() as ExtendedOlLayer[];
    }

    @action
    setResolution(resolution: number | null) {
        const oldResolution = this.resolution;
        this.resolution = resolution;
        this.notify("resolution", oldResolution, resolution);
    }
    @action
    setPosition(position: Position | null) {
        const oldPosition = this.position;
        this.position = position;
        if (position) {
            const { zoom, center } = position;
            this.setZoom(zoom);
            this.setCenter(center);
        }
        this.notify("position", oldPosition, position);
    }
    @action
    setCenter(center: number[] | null) {
        const oldCenter = this.center;
        this.center = center;
        this.notify("center", oldCenter, center);
    }
    @action
    setZoom(zoom: number) {
        const oldZoom = this.zoom;
        this.zoom = zoom;
        this.notify("zoom", oldZoom, zoom);
    }

    @action
    addLayer(layer: CoreLayer): void {
        const layers = { ...this.layers, [layer.name]: layer };
        this.layers = layers;
        const olLayer = layer.getLayer();
        if (layer.isBaseLayer) {
            olLayer.setZIndex(-1);
        }
        this.olMap.addLayer(olLayer);
    }

    @action.bound
    setLayerZIndex(layerDef: CoreLayer | number, zIndex: number) {
        const layer =
            typeof layerDef === "number" ? this.layers[layerDef] : layerDef;
        if (layer && layer.olLayer && layer.olLayer.setZIndex) {
            layer.olLayer.setZIndex(zIndex);
        }
    }

    @computed
    get baseLayers(): Layers {
        const layers: Layers = {};
        for (const [key, layer] of Object.entries(this.layers)) {
            if (!layer.isBaseLayer) continue;
            layers[key] = layer;
        }
        return layers;
    }

    removeLayer(layer: CoreLayer): void {
        this.olMap.removeLayer(layer.getLayer());
        const layers = { ...this.layers };
        delete layers[layer.name];
        this.layers === layers;
    }

    getScaleForResolution(res: number, mpu: number): number {
        return parseFloat(res.toString()) * (mpu * this.IPM * this.DPI);
    }

    getResolutionForScale(
        scale: number | string,
        mpu: number
    ): number | undefined {
        if (scale === null || scale === undefined) {
            return;
        }
        scale = typeof scale === "string" ? parseFloat(scale) : scale;
        return scale / (mpu * this.IPM * this.DPI);
    }

    getPosition(crs?: string): Position {
        const view = this.olMap.getView();
        let center = view.getCenter();
        if (!center) {
            throw new Error("Map center is not set");
        }

        const mapCrs = view.getProjection().getCode();
        if (crs && crs !== mapCrs) {
            center = olProj.transform(center, mapCrs, crs);
        }

        const zoom = view.getZoom();
        if (zoom === undefined) {
            throw new Error("Map zoom is not set");
        }

        return {
            zoom,
            center,
        };
    }

    getExtent(crs?: string): number[] {
        const view = this.olMap.getView();
        let extent = view.calculateExtent();
        const mapCrs = view.getProjection().getCode();

        if (crs && crs !== mapCrs) {
            extent = olProj.transformExtent(extent, mapCrs, crs);
        }

        return extent;
    }

    zoomToFeature(feature: Feature, options?: FitOptions): void {
        const geometry = feature.getGeometry();
        if (!geometry) {
            throw new Error("Feature has no geometry");
        }

        const extent = geometry.getExtent();
        this.zoomToExtent(extent, options);
    }

    zoomToExtent(extent: number[], options?: FitOptions): void {
        const view = this.olMap.getView();
        const widthExtent = olExtent.getWidth(extent);
        const heightExtent = olExtent.getHeight(extent);

        if (
            widthExtent < this.SMART_ZOOM_EXTENT &&
            heightExtent < this.SMART_ZOOM_EXTENT
        ) {
            const center = olExtent.getCenter(extent);
            view.setCenter(center);

            const zoom = view.getZoom();
            if (zoom !== undefined && zoom < this.SMART_ZOOM) {
                view.setZoom(this.SMART_ZOOM);
            }
        } else {
            view.fit(extent, options);
        }
    }

    zoomToNgwExtent(
        ngwExtent: NgwExtent,
        {
            displayProjection,
            ...options
        }: FitOptions & { displayProjection?: string } = {}
    ): void {
        const { minLon, minLat, maxLon, maxLat } = ngwExtent;
        if (
            minLon === null ||
            minLat === null ||
            maxLon === null ||
            maxLat === null
        ) {
            return;
        }

        const extent = olProj.transformExtent(
            [minLon, minLat, maxLon, maxLat],
            "EPSG:4326",
            displayProjection
        );

        this.zoomToExtent(extent, options);
    }

    getMaxZIndex(): number {
        const layers = this.olMap.getLayers().getArray();
        let maxZIndex = 0;

        layers.forEach((layer) => {
            const zIndex = layer.getZIndex();
            if (zIndex !== undefined && zIndex > maxZIndex) {
                maxZIndex = zIndex;
            }
        });

        return maxZIndex;
    }

    getControlContainer(): HTMLElement {
        return this._panelControl.getContainer();
    }

    createControl(control: MapControl, options: CreateControlOptions): Control {
        return createControl(control, options, this);
    }

    createButtonControl(options: ButtonControlOptions): Control {
        return createButtonControl(options);
    }

    addControl(
        control: Control,
        position: ControlPosition
    ): Control | undefined {
        this._panelControl.addControl(control, position);
        return control;
    }

    removeControl(control: Control): void {
        this._panelControl.removeControl(control);
    }

    getTargetElement() {
        return this.olMap.getTargetElement();
    }

    updateSize() {
        this.olMap.updateSize();
    }
}
