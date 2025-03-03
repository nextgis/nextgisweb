import Feature from "ol/Feature";
import Geolocation from "ol/Geolocation";
import { Control } from "ol/control";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";

import Icon from "@nextgisweb/icon/material/my_location";

interface GeolocationControlOptions {
    target?: HTMLElement;
    tipLabel?: string;
    display: Display;
}

const zIndexLocationLayer = 6000;

const positionFeatureStyle = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({
            color: "#076dbf",
        }),
        stroke: new Stroke({
            color: "#fff",
            width: 1,
        }),
    }),
});

export class MyLocation extends Control {
    private display: GeolocationControlOptions["display"];
    private geolocation?: Geolocation;
    private geolocationLayer?: VectorLayer<VectorSource>;
    private positionFeature?: Feature;
    private accuracyFeature?: Feature;
    private _shouldZoom: boolean = false;
    private button: HTMLButtonElement;

    constructor({ display, target, tipLabel }: GeolocationControlOptions) {
        const element = document.createElement("div");
        element.className = "ol-control ol-unselectable";

        const button = document.createElement("button");
        button.className = "toggle-button";
        const iconSpan = document.createElement("span");
        iconSpan.className = "ol-control__icon";

        iconSpan.innerHTML = iconHtml(Icon);

        button.appendChild(iconSpan);
        element.appendChild(button);

        if (tipLabel) {
            element.title = tipLabel;
        }

        if (!("geolocation" in navigator) || location.protocol !== "https:") {
            element.style.visibility = "hidden";
        }

        super({
            element,
            target,
        });

        this.display = display;
        this.button = button;

        element.addEventListener("click", this._onClick);
    }

    private _onClick = (): void => {
        if (this.geolocation) {
            this._disableGeolocation();
        } else {
            this._enableGeolocation();
        }
    };

    private _enableGeolocation(): void {
        this._shouldZoom = true;
        this._buildGeolocationLayer();
        this._makeGeolocation();
        this.button.classList.add("checked");
    }

    private _disableGeolocation(): void {
        if (this.geolocation) {
            this.geolocation.setTracking(false);
            this.geolocation = undefined;
        }

        if (this.geolocationLayer) {
            this.geolocationLayer.setMap(null);
            this.geolocationLayer = undefined;
        }

        this.positionFeature = undefined;
        this.accuracyFeature = undefined;
        this._shouldZoom = false;
        this.button.classList.remove("checked");
    }

    private _makeGeolocation(): void {
        this.geolocation = new Geolocation({
            trackingOptions: {
                enableHighAccuracy: true,
            },
            projection: this.display.map.olMap.getView().getProjection(),
            tracking: true,
        });

        this.geolocation.on("change:accuracyGeometry", () =>
            this._onGeolocationGeometryChange()
        );
        this.geolocation.on("change:position", () =>
            this._onGeolocationPosChange()
        );
        this.geolocation.on("error", () => this._onGeolocationError());
    }

    private _buildGeolocationLayer(): void {
        this.positionFeature = new Feature();
        this.positionFeature.setStyle(positionFeatureStyle);
        this.accuracyFeature = new Feature();

        this.geolocationLayer = new VectorLayer({
            map: this.display.map.olMap,
            source: new VectorSource({
                features: [this.accuracyFeature, this.positionFeature],
            }),
        });
        this.geolocationLayer.setZIndex(zIndexLocationLayer);
    }

    private _onGeolocationGeometryChange(): void {
        if (this.accuracyFeature && this.geolocation) {
            this.accuracyFeature.setGeometry(
                this.geolocation.getAccuracyGeometry() || undefined
            );
        }
    }

    private _onGeolocationPosChange(): void {
        if (this.positionFeature && this.geolocation) {
            const coordinates = this.geolocation.getPosition();
            this.positionFeature.setGeometry(
                coordinates ? new Point(coordinates) : undefined
            );

            if (this._shouldZoom) {
                this._shouldZoom = false;
                this._zoomToPosition();
            }
        }
    }

    private _onGeolocationError(): void {
        this._disableGeolocation();
        this.element.classList.add("error");
        this.element.setAttribute(
            "title",
            gettext("Your location could not be determined")
        );
    }

    private _zoomToPosition(): void {
        if (!this.positionFeature || !this.positionFeature.getGeometry())
            return;
        const extent = this.positionFeature.getGeometry()!.getExtent();
        this.display.map.zoomToExtent(extent);
    }
}
