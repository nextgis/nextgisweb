import OLMap from "ol/Map";
import type { MapOptions } from "ol/PluggableMap";
import * as Extent from "ol/extent";
import type { Layer } from "ol/layer";
import * as Proj from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";

type ExtentType = Extent.Extent;

export class MapAdapter {
    map: OLMap;

    DPI = 1000 / 39.37 / 0.28;

    IPM = 39.37;

    // limit extent to applying smart zoom
    SMART_ZOOM_EXTENT = 100;

    SMART_ZOOM = 12;

    constructor(options: MapOptions) {
        this.map = new OLMap(options);
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
            center = Proj.transform(center, mapSrsId, srsId);
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
            extent = Proj.transformExtent(extent, mapSrsId, srsId);
        }
        return extent;
    }

    zoomToExtent(extent: ExtentType) {
        const view = this.map.getView();

        const widthExtent = Extent.getWidth(extent);
        const heightExtent = Extent.getHeight(extent);
        let center;

        // If feature extent smaller than SMART_ZOOM_EXTENT then applying smart zoom to it
        if (
            widthExtent < this.SMART_ZOOM_EXTENT &&
            heightExtent < this.SMART_ZOOM_EXTENT
        ) {
            center = Extent.getCenter(extent);
            view.setCenter(center);
            const zoom = view.getZoom();
            if (zoom) {
                if (zoom < this.SMART_ZOOM) {
                    view.setZoom(this.SMART_ZOOM);
                }
            }
        } else {
            view.fit(extent);
        }
    }

    zoomToLayer(layer: Layer) {
        const extent = layer.getExtent();
        if (extent) {
            this.zoomToExtent(extent);
        }
    }

    zoomToNgwExtent(ngwExtent: NgwExtent, mapProjection?: string) {
        const { minLon, minLat, maxLon, maxLat } = ngwExtent;
        if (!(minLon && minLat && maxLon && maxLat)) {
            return;
        }
        if (!mapProjection) {
            mapProjection = "EPSG:3857";
        }
        const extent = Proj.transformExtent(
            [minLon, minLat, maxLon, maxLat],
            "EPSG:4326",
            mapProjection
        );
        this.zoomToExtent(extent);
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
}
