import { action, computed, observable, runInAction } from "mobx";
import { Map as OlMap } from "ol";
import type { Feature, View } from "ol";
import type { MapOptions as OlMapOptions } from "ol/PluggableMap";
import * as olExtent from "ol/extent";
import * as olProj from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import { imageQueue } from "@nextgisweb/pyramid/util";

import { Watchable } from "../compat/Watchable";

import type { CoreLayer } from "./layer/_Base";

import "ol/ol.css";

interface MapOptions extends OlMapOptions {
    view: View;
    logo?: boolean;
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
}

export class Map extends Watchable<MapWatchableProps> {
    private readonly DPI = 1000 / 39.37 / 0.28;
    private readonly IPM = 39.37;
    private readonly SMART_ZOOM_EXTENT = 100;
    private readonly SMART_ZOOM = 12;

    readonly olMap: OlMap;
    @observable.shallow accessor layers: Layers = {};

    @observable accessor resolution: number | null = null;
    @observable accessor center: number[] | null = null;
    @observable.shallow accessor position: Position | null = null;

    constructor(private options: MapOptions) {
        super();
        const { target, ...rest } = this.options;
        this.olMap = new OlMap(rest);
    }

    startup(target: HTMLElement) {
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
        // Workaround to scip first map move event on start
        olMap.once("movestart", () => {
            olMap.on("movestart", () => {
                imageQueue.abort();
            });
        });
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
        this.notify("position", oldPosition, position);
    }
    @action
    setCenter(center: number[] | null) {
        const oldCenter = this.center;
        this.center = center;
        this.notify("center", oldCenter, center);
    }

    @action
    addLayer(layer: CoreLayer): void {
        const layers = { ...this.layers, [layer.name]: layer };
        this.layers = layers;
        this.olMap.addLayer(layer.getLayer());
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

    zoomToFeature(feature: Feature): void {
        const geometry = feature.getGeometry();
        if (!geometry) {
            throw new Error("Feature has no geometry");
        }

        const extent = geometry.getExtent();
        this.zoomToExtent(extent);
    }

    zoomToExtent(extent: number[]): void {
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
            view.fit(extent);
        }
    }

    zoomToNgwExtent(
        ngwExtent: NgwExtent,
        displayProjection: string = "EPSG:3857"
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

        this.zoomToExtent(extent);
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
}
