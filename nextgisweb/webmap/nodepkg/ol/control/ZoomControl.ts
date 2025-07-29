import type { Map } from "ol";
import type { FitOptions } from "ol/View";
import Zoom from "ol/control/Zoom";
import type { Options } from "ol/control/Zoom";
import type { Extent } from "ol/extent";
import { transformExtent } from "ol/proj";
import type { ProjectionLike } from "ol/proj";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";

import InitialExtentIcon from "@nextgisweb/icon/material/home";

import "./ZoomControl.less";

export interface ZoomControlOptions extends Options {
    extent?: Extent;
    fitOptions?: FitOptions;
    extentProjection?: ProjectionLike;
    showZoomLevel?: boolean;
}

export class ZoomControl extends Zoom {
    private homeButton: HTMLButtonElement;
    private extent: Extent | undefined;
    private fitOptions: FitOptions;
    private extentProjection: ProjectionLike;
    private isAdded: boolean = false;
    private zoomLevelDisplay?: HTMLSpanElement;

    constructor(options: ZoomControlOptions) {
        super(options);
        this.extent = options.extent;
        this.fitOptions = options.fitOptions || {};
        this.extentProjection = options.extentProjection || "EPSG:4326";
        this.element.classList.remove("ol-control");
        this.element.classList.add(
            "mapadapter-btn-ctrl",
            "mapadapter-ctrl-group"
        );

        this.homeButton = document.createElement("button");
        this.homeButton.innerHTML = iconHtml(InitialExtentIcon);
        this.homeButton.className = "home-button";
        this.homeButton.title = gettext("Back to the initial extent");
        this.homeButton.addEventListener(
            "click",
            this.handleHomeClick.bind(this)
        );

        this.updateHomeButtonVisibility();

        if (options.showZoomLevel) {
            this.zoomLevelDisplay = document.createElement("span");
            this.zoomLevelDisplay.className = "zoom-level-display";
            this.zoomLevelDisplay.title = gettext("Current zoom level");

            const zoomInButton = this.element.querySelector(".ol-zoom-in");
            const zoomOutButton = this.element.querySelector(".ol-zoom-out");

            if (zoomInButton && zoomOutButton) {
                this.element.insertBefore(this.zoomLevelDisplay, zoomOutButton);
            } else {
                this.element.appendChild(this.zoomLevelDisplay);
            }
        }
    }

    setMap(map: Map | null): void {
        super.setMap(map);
        if (map && this.zoomLevelDisplay) {
            const view = map.getView();
            this.updateZoomLevel(view.getZoom() ?? 0);
            view.on("change:resolution", () => {
                this.updateZoomLevel(view.getZoom() ?? 0);
            });
        }
    }

    private updateZoomLevel(zoom: number): void {
        if (this.zoomLevelDisplay) {
            const rounded = parseFloat(zoom.toFixed(1));
            this.zoomLevelDisplay.textContent = Number.isInteger(rounded)
                ? String(rounded.toFixed(0))
                : String(rounded);
        }
    }

    setExtent(extent: Extent | undefined): void {
        this.extent = extent;
        this.updateHomeButtonVisibility();
    }

    setFitOptions(fitOptions: FitOptions): void {
        this.fitOptions = { ...this.fitOptions, ...fitOptions };
    }

    setExtentProjection(projection: ProjectionLike): void {
        this.extentProjection = projection;
    }

    private updateHomeButtonVisibility(): void {
        if (this.extent) {
            this.addHomeButton();
        } else {
            this.removeHomeButton();
        }
    }

    addHomeButton(): void {
        if (!this.isAdded) {
            this.element.appendChild(this.homeButton);
            this.isAdded = true;
        }
    }

    removeHomeButton(): void {
        if (this.isAdded) {
            this.element.removeChild(this.homeButton);
            this.isAdded = false;
        }
    }

    private handleHomeClick(): void {
        const map = this.getMap();
        if (map && this.extent) {
            const view = map.getView();
            const projectedExtent = transformExtent(
                this.extent,
                this.extentProjection,
                view.getProjection()
            );

            view.fit(projectedExtent, {
                ...this.fitOptions,
            });
        }
    }
}
