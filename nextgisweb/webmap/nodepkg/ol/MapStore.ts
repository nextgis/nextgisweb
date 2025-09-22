import { action, computed, observable } from "mobx";
import type { Feature } from "ol";
import OlMap from "ol/Map";
import type { MapOptions as OlMapOptions } from "ol/Map";
import { unByKey } from "ol/Observable";
import View from "ol/View";
import type { FitOptions } from "ol/View";
import type Control from "ol/control/Control";
import type { EventsKey } from "ol/events";
import * as olExtent from "ol/extent";
import type { Extent } from "ol/extent";
import { fromExtent } from "ol/geom/Polygon";
import * as olProj from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { imageQueue } from "@nextgisweb/pyramid/util";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";

import { Watchable } from "../compat/Watchable";
import type {
    CreateControlOptions,
    MapControl,
    TargetPosition,
} from "../control-container/ControlContainer";

import { createControl } from "./control/createControl";
import type { CoreLayer, ExtendedOlLayer } from "./layer/CoreLayer";
import { PanelControl } from "./panel-control/PanelControl";
import type { ControlOptions } from "./panel-control/PanelControl";
import { mapStartup } from "./util/mapStartup";
import { scaleForResolution } from "./util/resolutionUtil";

import "ol/ol.css";

export interface MapExtent extends FitOptions {
    extent: NgwExtent;
    srs: SRSRef;
}

interface MapOptions extends OlMapOptions {
    logo?: boolean;
    extent?: Extent;
    measureSrsId?: number | null;
    initialExtent?: Extent;
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
    readonly panelControl: PanelControl;

    private readonly DPI = 1000 / 39.37 / 0.28;
    private readonly IPM = 39.37;
    private readonly SMART_ZOOM_EXTENT = 100;
    private readonly SMART_ZOOM = 12;

    private readonly initialExtent?: Extent;

    @observable.ref accessor olMap: OlMap;
    @observable.ref accessor olView: View;

    @observable.ref accessor ready = false;

    @observable.shallow accessor layers: Layers = {};

    @observable.ref accessor baseLayer: CoreLayer | null = null;
    @observable.ref accessor resolution: number | null = null;
    @observable.struct accessor center: number[] | null = null;
    @observable.ref accessor zoom: number | null = null;
    @observable.ref accessor measureSrsId: number | null = null;
    @observable.struct accessor position: Position | null = null;
    @observable.struct accessor rotation: number = 0;

    @observable.ref accessor mapState: string | null = null;
    @observable.ref accessor defaultMapState: string | null = null;

    private _viewUnbindKeys: EventsKey[] = [];
    private _mapUnbindKeys: EventsKey[] = [];

    constructor(private options: MapOptions) {
        super();
        const { target, extent, initialExtent, measureSrsId, ...viewOptions } =
            this.options;
        this.measureSrsId = measureSrsId ?? null;
        this.initialExtent = initialExtent;
        if (!viewOptions.view) {
            viewOptions.view = new View({
                maxZoom: 24,
                // Must always be true for correct tile caching with image adapters
                constrainResolution: true,
                extent,
            });
        }
        this.olMap = new OlMap(viewOptions);
        this.olView = this.olMap.getView();
        this.panelControl = new PanelControl();
        this.olMap.addControl(this.panelControl);
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

    @action.bound
    setMapState(val: string | null) {
        this.mapState = val;
    }
    @action.bound
    deactivateMapState(val: string) {
        if (this.mapState === val) {
            this.mapState = null;
        }
    }

    @action.bound
    setDefaultMapState(val: string | null) {
        this.defaultMapState = val;
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
            if (this._mapUnbindKeys.length) {
                this.detach();
            }

            const olMap = this.olMap;

            const olView = olMap.getView();

            const s = this.getSetters(olView);

            const applyInitialState = () => {
                s.setResolution();
                s.setCenter();
                s.setPosition();
                s.setRotation();
            };
            this.bindView(olView);
            this._mapUnbindKeys.push(
                olMap.on("moveend", s.setPosition),
                olMap.once("rendercomplete", applyInitialState),

                // Workaround to skip first map move event on start
                olMap.once("movestart", () => {
                    // Map ready only then first move happend
                    resolve();
                    this.setReady(true);
                    mapStartup({ olMap, queue: imageQueue });
                })
            );

            olMap.setTarget(target);
        });
    }

    setView(view: View): void {
        this.unView();
        this.bindView(view);

        this.olMap.setView(view);
        this._setView(view);
    }

    @action
    private _setView(view: View) {
        this.olView = view;
    }
    private bindView(view: View) {
        const s = this.getSetters(view);
        this._viewUnbindKeys.push(
            view.on("change:resolution", s.setResolution),
            view.on("change:center", s.setCenter),
            view.on("change:rotation", s.setRotation)
        );
    }
    private unView() {
        if (this._viewUnbindKeys) {
            this._viewUnbindKeys.forEach(unByKey);
        }
        this._viewUnbindKeys = [];
    }

    detach(): void {
        this.unView();
        if (this._mapUnbindKeys) {
            this._mapUnbindKeys.forEach(unByKey);
        }
        this._mapUnbindKeys = [];
        this.setReady(false);
        this.olMap.setTarget(undefined);
    }

    getLayersArray() {
        return this.olMap.getLayers().getArray() as ExtendedOlLayer[];
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

    @action.bound
    removeLayer(layer: CoreLayer): void {
        this.olMap.removeLayer(layer.getLayer());
        const layers = { ...this.layers };
        delete layers[layer.name];
        this.layers = layers;
    }

    @computed
    get scale(): number | undefined {
        const resolution = this.resolution;

        if (resolution === null) return;

        return scaleForResolution({
            dpi: this.DPI,
            ipm: this.IPM,
            projection: this.olView.getProjection(),
            resolution,
        });
    }

    resolutionForScale(scale: number | string): number | undefined {
        if (scale === null || scale === undefined) {
            return;
        }
        const mpu = this.olView.getProjection().getMetersPerUnit() ?? 1;
        scale = typeof scale === "string" ? parseFloat(scale) : scale;
        return scale / (mpu * this.DPI * this.IPM);
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

    fitNGWExtent(mapExtent: MapExtent) {
        const view = this.olMap.getView();
        const { extent, srs, ...fitOptions } = mapExtent;
        const bbox = [
            extent.minLon,
            extent.minLat,
            extent.maxLon,
            extent.maxLat,
        ];
        view.fitInternal(
            fromExtent(
                olProj.transformExtent(
                    bbox,
                    `EPSG:${srs.id}`,
                    view.getProjection()
                )
            ),
            fitOptions
        );
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

    zoomToInitialExtent() {
        if (this.initialExtent) {
            this.olMap.getView().fit(this.initialExtent);
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
        return this.panelControl.getContainer();
    }

    createControl(control: MapControl, options: CreateControlOptions): Control {
        return createControl(control, options, this);
    }

    addControl(options: ControlOptions): Control | undefined {
        this.panelControl.addControl(options);
        return options.control;
    }
    updateControlPlacement(
        control: Control,
        position: TargetPosition,
        order?: number
    ): Control | undefined {
        this.panelControl.updateControlPlacement(control, position, order);
        return control;
    }

    removeControl(control: Control): void {
        this.panelControl.removeControl(control);
    }

    @computed
    get targetElement() {
        if (this.ready) {
            return this.olMap.getTargetElement();
        }
        return null;
    }

    updateSize() {
        this.olMap.updateSize();
    }

    @action
    private setReady(val: boolean) {
        this.ready = val;
    }

    @action
    private setResolution(resolution: number | null) {
        const oldResolution = this.resolution;
        this.resolution = resolution;
        this.notify("resolution", oldResolution, resolution);
    }
    @action
    private setPosition(position: Position | null) {
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
    private setCenter(center: number[] | null) {
        const oldCenter = this.center;
        this.center = center;
        this.notify("center", oldCenter, center);
    }
    @action
    private setZoom(zoom: number) {
        const oldZoom = this.zoom;
        this.zoom = zoom;
        this.notify("zoom", oldZoom, zoom);
    }
    @action
    private setRotation(rad: number) {
        this.rotation = typeof rad === "number" ? rad : 0;
    }

    private getSetters(olView: View) {
        return {
            setResolution: () =>
                this.setResolution(olView.getResolution() ?? null),
            setCenter: () => {
                this.setCenter(olView.getCenter() ?? null);
            },
            setPosition: () => {
                this.setPosition(this.getPosition());
            },
            setRotation: () => {
                this.setRotation(olView.getRotation());
            },
        };
    }
}
