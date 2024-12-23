import { debounce } from "lodash-es";
import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay";
import type { EventsKey } from "ol/events";
import GeoJSON from "ol/format/GeoJSON";
import { LineString, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { html as htmlIcon } from "@nextgisweb/pyramid/icon";
import settings from "@nextgisweb/pyramid/settings!webmap";
import type { Display } from "@nextgisweb/webmap/display";
import { MeasureArea, MeasureDistance } from "@nextgisweb/webmap/icon";
import { formatMetersArea, formatMetersLength } from "@nextgisweb/webmap/utils";
import type { DefaultConfig } from "@nextgisweb/webmap/utils/format-units";

import { ToolBase } from "./ToolBase";

import "./Measure.css";

interface MeasureOptions {
    display: Display;
    type: "LineString" | "Polygon";
}

const DELAY = 200;

export class ToolMeasure extends ToolBase {
    private readonly vector: VectorLayer<VectorSource>;
    private readonly interaction: Draw;
    private active: boolean = false;
    private measureTooltips: Record<number, Overlay> = {};
    private debouncedMeasurements: Record<number, ReturnType<typeof debounce>> =
        {};
    private tooltipCounter: number = 0;
    private currentTooltipId: number | null = null;
    private changeListener?: EventsKey;
    label: string;
    customIcon: string;

    constructor({ display, type }: MeasureOptions) {
        super({ display });

        this.label =
            type === "LineString"
                ? gettext("Measure distance")
                : gettext("Measure area");

        this.customIcon = `
            <span class="ol-control__icon">
                <svg class="icon" fill="currentColor">
                    <use xlink:href="#${type === "LineString" ? MeasureDistance.id : MeasureArea.id}"/>
                </svg>
            </span>`;

        const fillColor = "rgba(7, 109, 191, .2)";
        const strokeColor = getComputedStyle(
            document.documentElement
        ).getPropertyValue("--primary");

        const style = new Style({
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({
                color: strokeColor,
                width: 2,
            }),
            image: new Circle({
                radius: 5,
                fill: new Fill({ color: fillColor }),
                stroke: new Stroke({ color: strokeColor }),
            }),
        });

        const source = new VectorSource();
        this.vector = new VectorLayer({ source, style });
        this.display.map.olMap.addLayer(this.vector);

        this.interaction = new Draw({
            source,
            type,
            style,
        });

        this.display.map.olMap.addInteraction(this.interaction);
        this.interaction.setActive(false);
        this.vector.setZIndex(this.display.map.getMaxZIndex() + 1);

        this.setupMeasureListeners();
    }

    private createMeasureTooltip() {
        const element = document.createElement("div");
        element.className = "ol-tooltip ol-tooltip-measure";

        const tooltipId = this.tooltipCounter++;
        const tooltip = new Overlay({
            element,
            offset: [0, -15],
            positioning: "bottom-center",
            stopEvent: true,
            insertFirst: false,
        });

        this.measureTooltips[tooltipId] = tooltip;

        this.debouncedMeasurements[tooltipId] = debounce(
            async (geom: Geometry) => {
                const tooltip = this.measureTooltips[tooltipId];
                if (!tooltip) return;
                const measure = await this.updateMeasurement(geom);
                if (measure) {
                    const tooltipElement = tooltip.getElement();
                    if (tooltipElement !== undefined) {
                        tooltipElement.innerHTML = "";
                        const content = document.createElement("span");
                        content.className = "tooltip-content";
                        tooltipElement.appendChild(content);
                        content.innerHTML = measure;

                        const closeButton = document.createElement("button");
                        closeButton.className = "tooltip-close-button";
                        closeButton.innerHTML = htmlIcon({ glyph: "close" });
                        tooltipElement.appendChild(closeButton);

                        closeButton.onclick = (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            this.closeTooltip(tooltipId);
                            const source = this.vector.getSource();
                            if (source) {
                                const feature =
                                    source.getFeatureById(tooltipId);
                                if (feature) {
                                    source.removeFeature(feature);
                                }
                            }
                        };
                    }
                }
            },
            DELAY
        );

        this.currentTooltipId = tooltipId;
        this.display.map.olMap.addOverlay(tooltip);

        return tooltipId;
    }

    private closeTooltip(tooltipId: number): void {
        const tooltip = this.measureTooltips[tooltipId];
        if (tooltip) {
            this.display.map.olMap.removeOverlay(tooltip);
            delete this.measureTooltips[tooltipId];
            const debouncedMeasure = this.debouncedMeasurements[tooltipId];
            if (debouncedMeasure) {
                debouncedMeasure.cancel();
                delete this.debouncedMeasurements[tooltipId];
            }
        }
    }

    private async updateMeasurement(geom: Geometry): Promise<string> {
        const isArea = geom instanceof Polygon;
        const srsId = this.getMeasureSrsId();
        if (!this.isValid(geom) || srsId === undefined) return "";

        try {
            const response = await route(
                isArea
                    ? "spatial_ref_sys.geom_area"
                    : "spatial_ref_sys.geom_length",
                { id: srsId }
            ).post({
                json: {
                    geom: new GeoJSON().writeGeometryObject(geom, {
                        rightHanded: true,
                    }),
                    geom_format: "geojson",
                    srs: this.getMapSRID(),
                },
            });

            return this.formatUnits(response.value, isArea);
        } catch {
            return "@#!*~^$";
        }
    }

    private setupMeasureListeners() {
        this.interaction.on("drawend", () => {
            if (this.currentTooltipId !== null) {
                const tooltip = this.measureTooltips[this.currentTooltipId];
                if (tooltip) {
                    tooltip.getElement()!.className =
                        "ol-tooltip ol-tooltip-static";
                    tooltip.setOffset([0, -7]);
                }
            }
            if (this.changeListener) {
                unByKey(this.changeListener);
                this.changeListener = undefined;
            }
            this.currentTooltipId = null;
        });

        this.interaction.on("drawstart", (evt) => {
            const tooltipId = this.createMeasureTooltip();
            evt.feature.setId(tooltipId);
            this.changeListener = evt.feature
                .getGeometry()!
                .on("change", (e) => {
                    const geom = e.target;
                    let coord;
                    if (!this.isValid(geom)) return;

                    if (geom instanceof Polygon) {
                        const ring = geom.getLinearRing(0);
                        if (!ring || ring.getCoordinates().length <= 3) return;
                        coord = geom.getInteriorPoint().getCoordinates();
                    } else if (geom instanceof LineString) {
                        const coords = geom.getCoordinates();
                        if (coords.length <= 1) return;
                        coord = coords[coords.length - 1];
                    }

                    if (coord && this.currentTooltipId !== null) {
                        const tooltip =
                            this.measureTooltips[this.currentTooltipId];
                        const debouncedMeasure =
                            this.debouncedMeasurements[this.currentTooltipId];
                        if (tooltip && debouncedMeasure) {
                            tooltip.setPosition(coord);
                            tooltip.getElement()!.innerHTML = "...";
                            debouncedMeasure(geom);
                        }
                    }
                });
        });
    }

    private isValid(geom: Geometry): boolean {
        if (geom instanceof Polygon) {
            const ring = geom.getLinearRing(0);
            return ring ? ring.getCoordinates().length > 3 : false;
        }
        if (geom instanceof LineString) {
            return geom.getCoordinates().length > 1;
        }
        return false;
    }

    private formatUnits(value: number, isArea: boolean): string {
        const formatConfig: DefaultConfig = {
            format: "html-string",
            locale: ngwConfig.locale,
        };

        return (
            isArea
                ? formatMetersArea(
                      value,
                      settings.units_area ?? "sq_km",
                      formatConfig
                  )
                : formatMetersLength(
                      value,
                      settings.units_length ?? "km",
                      formatConfig
                  )
        ) as string;
    }

    private getMapSRID(): number {
        const proj = this.display.map.olMap.getView().getProjection();
        return parseInt(proj.getCode().match(/EPSG:(\d+)/)![1], 10);
    }

    private getMeasureSrsId() {
        return this.display.config.measureSrsId || settings.measurement_srid;
    }

    activate(): void {
        if (this.active) return;
        this.active = true;
        this.interaction.setActive(true);
    }

    deactivate(): void {
        if (!this.active) return;
        this.active = false;
        this.interaction.setActive(false);

        // Cancel all pending debounced measurements
        Object.values(this.debouncedMeasurements).forEach(
            (debouncedMeasure) => {
                debouncedMeasure.cancel();
            }
        );

        Object.values(this.measureTooltips).forEach((tooltip) => {
            this.display.map.olMap.removeOverlay(tooltip);
        });
        this.measureTooltips = {};
        this.debouncedMeasurements = {};
        this.tooltipCounter = 0;
        this.currentTooltipId = null;

        const source = this.vector.getSource();
        if (source) source.clear();

        this.display.map.olMap
            .getOverlays()
            .getArray()
            .filter((overlay) =>
                overlay.getElement()?.classList.contains("ol-tooltip-static")
            )
            .forEach((overlay) =>
                this.display.map.olMap.removeOverlay(overlay)
            );
    }
}
