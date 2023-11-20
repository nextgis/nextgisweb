import type Map from "ol/Map";
import { Control } from "ol/control";
import { ScaleLine } from "ol/control";
import { getPointResolution } from "ol/proj";
import Units from "ol/proj/Units";

type FormatNumberFunction = (
    num: number,
    digits: number,
    units: string[]
) => string;

const DOTS_PER_INCH = 96;
const INCHES_PER_METER = 39.3701;

function createElement(tagName: string, classes?: string | string[]): Element {
    const elem = document.createElement(tagName);

    if (classes) {
        elem.classList.add(
            ...(typeof classes === "string" ? classes.split(" ") : classes)
        );
    }

    return elem;
}

const formatNumber: FormatNumberFunction = (
    num: number,
    digits: number = 0,
    units: string[] = ["k", "M", "G"]
) => {
    for (let i = units.length - 1; i >= 0; i--) {
        const decimal = Math.pow(1000, i + 1);

        if (num <= -decimal || num >= decimal) {
            return (num / decimal).toFixed(digits) + units[i];
        }
    }

    return num.toString();
};

interface MapScaleControlOptions {
    className?: string;
    scaleLineClassName?: string;
    scaleValueClassName?: string;
    units?: string[];
    formatNumber?: FormatNumberFunction;
    onChangeScale?: (scale: string) => void;
    digits?: number;
    scaleLine?: boolean;
    target?: HTMLElement;
}

class MapScaleControl extends Control {
    private units_?: string[];
    private formatNumber_: FormatNumberFunction;
    private onScaleChange_?: (scale: string) => void;
    private digits_: number;
    private scaleValueElement_: HTMLElement;
    private previousScaleValue_: string | null;
    private scaleLine_?: ScaleLine;

    constructor(options: MapScaleControlOptions = {}) {
        const className = options.className || "ol-mapscale";
        const scaleLineClassName =
            options.scaleLineClassName || "ol-scale-line";
        const scaleValueClassName =
            options.scaleValueClassName || "ol-scale-value";

        const element = createElement("div", className) as HTMLDivElement;
        super({ element, target: options.target });

        this.units_ = options.units;
        this.formatNumber_ = options.formatNumber || formatNumber;
        this.onScaleChange_ = options.onChangeScale;
        this.digits_ = options.digits || 0;
        this.scaleValueElement_ = createElement(
            "div",
            scaleValueClassName
        ) as HTMLDivElement;
        element.appendChild(this.scaleValueElement_);
        this.previousScaleValue_ = null;

        if (options.scaleLine !== false) {
            const scaleLineElement = createElement(
                "div",
                "ol-scale-line-target"
            ) as HTMLDivElement;
            element.appendChild(scaleLineElement);

            this.scaleLine_ = new ScaleLine({
                target: scaleLineElement,
                className: scaleLineClassName,
            });
        }
    }

    setMap(map: Map) {
        super.setMap(map);
        this.setScaleLineVisibility(true);
        if (map) {
            map.on("postrender", () => {
                this.updateElement_();
            });
        }
    }

    setScaleLineVisibility(visible: boolean) {
        if (this.scaleLine_) {
            if (visible) {
                const map = this.getMap();
                if (map) {
                    this.scaleLine_.setMap(map);
                }
            } else {
                this.scaleLine_.setMap(null);
            }
        }
    }

    setScaleValueVisibility(visible: boolean) {
        this.scaleValueElement_.style.display = visible ? "" : "none";
    }

    private updateElement_() {
        const map = this.getMap();
        if (!map) {
            return;
        }
        const view = map.getView();
        const resolution = view.getResolution();
        const projection = view.getProjection();
        const center = view.getCenter();
        if (resolution !== undefined && center !== undefined) {
            const pointResolution = getPointResolution(
                projection,
                resolution,
                center,
                Units.METERS
            );
            const scale = Math.round(
                pointResolution * INCHES_PER_METER * DOTS_PER_INCH
            );
            // TODO: Review the rounding method to ensure the scale value is accurate and does not diverge from the actual scale on the map.
            const scaleValue = this.formatNumber_(
                scale,
                this.digits_,
                this.units_ || []
            );

            if (this.previousScaleValue_ !== scaleValue) {
                this.previousScaleValue_ = scaleValue;
                if (this.onScaleChange_) {
                    this.onScaleChange_(scaleValue);
                }
            }
            this.scaleValueElement_.innerHTML = `1 : ${scaleValue}`;
        }
    }
}

export default MapScaleControl;
