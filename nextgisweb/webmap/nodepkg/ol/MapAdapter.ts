import OLMap from "ol/Map";
import type { MapOptions } from "ol/PluggableMap";
import type { FitOptions } from "ol/View";
import type Control from "ol/control/Control";
import { getCenter, getHeight, getWidth } from "ol/extent";
import type { Extent } from "ol/extent";
import type { Layer } from "ol/layer";
import type BaseLayer from "ol/layer/Base";
import { transform, transformExtent } from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";

import type {
    ControlPosition,
    CreateControlOptions,
    MapControl,
} from "../control-container/ControlContainer";

import { createButtonControl } from "./control/createButtonControl";
import type { ButtonControlOptions } from "./control/createButtonControl";
import { createControl } from "./control/createControl";
import { PanelControl } from "./panel-control/PanelControl";

type ExtentType = Extent;

export class MapAdapter {
    map: OLMap;

    DPI = 1000 / 39.37 / 0.28;

    IPM = 39.37;

    // limit extent to applying smart zoom
    SMART_ZOOM_EXTENT = 100;

    SMART_ZOOM = 12;

    private _panelControl: PanelControl;

    constructor(options: MapOptions) {
        this.map = new OLMap({ controls: [], ...options });
        this._panelControl = new PanelControl();
        this.map.addControl(this._panelControl);
    }

    getScaleForResolution(res: string, mpu: number) {
        return parseFloat(res) * (mpu * this.IPM * this.DPI);
    }

    getResolutionForScale(scale: string, mpu: number) {
        return parseFloat(scale) / (mpu * this.IPM * this.DPI);
    }

    getPosition(srsId: string) {
        const view = this.map.getView();
        let center = view.getCenter();
        const mapSrsId = view.getProjection().getCode();
        if (srsId && srsId !== mapSrsId && center) {
            center = transform(center, mapSrsId, srsId);
        }
        return {
            zoom: view.getZoom(),
            center: center,
        };
    }

    getExtent(srsId: string) {
        const view = this.map.getView();
        let extent = view.calculateExtent();
        const mapSrsId = view.getProjection().getCode();
        if (srsId && srsId !== mapSrsId) {
            extent = transformExtent(extent, mapSrsId, srsId);
        }
        return extent;
    }

    zoomToExtent(extent: ExtentType, options?: FitOptions) {
        const view = this.map.getView();

        const widthExtent = getWidth(extent);
        const heightExtent = getHeight(extent);
        let center;

        // If feature extent smaller than SMART_ZOOM_EXTENT then applying smart zoom to it
        if (
            widthExtent < this.SMART_ZOOM_EXTENT &&
            heightExtent < this.SMART_ZOOM_EXTENT
        ) {
            center = getCenter(extent);
            view.setCenter(center);
            const zoom = view.getZoom();
            if (zoom) {
                if (zoom < this.SMART_ZOOM) {
                    view.setZoom(this.SMART_ZOOM);
                }
            }
        } else {
            view.fit(extent, options);
        }
    }

    zoomToLayer(layer: Layer, options?: FitOptions) {
        const extent = layer.getExtent();
        if (extent) {
            this.zoomToExtent(extent, options);
        }
    }

    zoomToNgwExtent(
        ngwExtent: NgwExtent,
        {
            mapProjection,
            ...options
        }: FitOptions & { mapProjection?: string } = {}
    ) {
        const { minLon, minLat, maxLon, maxLat } = ngwExtent;
        if (!(minLon && minLat && maxLon && maxLat)) {
            return;
        }
        if (!mapProjection) {
            mapProjection = "EPSG:3857";
        }
        const extent = transformExtent(
            [minLon, minLat, maxLon, maxLat],
            "EPSG:4326",
            mapProjection
        );
        this.zoomToExtent(extent, options);
    }

    getMaxZIndex() {
        const layers = this.map.getLayers().getArray();
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

    addLayer(layer: BaseLayer) {
        this.map.addLayer(layer);
    }
    removeLayer(layer: BaseLayer) {
        this.map.removeLayer(layer);
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
        return this.map.getTargetElement();
    }

    updateSize() {
        this.map.updateSize();
    }
}
