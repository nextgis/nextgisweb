import { default as topic } from "dojo/topic";
import debounce from "lodash-es/debounce";
import Map from "ol/Map";
import type OlMap from "ol/Map";
import View from "ol/View";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { defaults as defaultInteractions } from "ol/interaction";
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as OlMapScale } from "ngw-webmap/ol-ext/ol-mapscale";

import { buildPrintStyle } from "./PrintMapStyle";

import "./PrintMap.less";

const setMapScale = (scale: number, olMap: OlMap): void => {
    const view = olMap.getView();
    const center = view.getCenter();
    const cosh = function (value) {
        return (Math.exp(value) + Math.exp(-value)) / 2;
    };
    const pointResolution3857 = cosh(center[1] / 6378137);
    const resolution = pointResolution3857 * (scale / (96 * 39.3701));
    olMap.getView().setResolution(resolution);
};

const buildMap = (
    container: HTMLElement,
    display,
    onScaleChange
): [OlMap, any] => {
    const interactions = defaultInteractions({
        doubleClickZoom: true,
        keyboard: true,
        mouseWheelZoom: true,
        shiftDragZoom: false,
    });

    const view = new View({
        center: display.map.olMap.getView().getCenter(),
        zoom: display.map.olMap.getView().getZoom(),
    });

    const printMap: OlMap = new Map({
        target: container,
        controls: [],
        interactions,
        view: view,
    });

    const mapScale = new OlMapScale({
        formatNumber: function (scale) {
            return Math.round(scale / 1000) * 1000;
        },
    });
    printMap.addControl(mapScale);

    const onChangeScale = debounce((scale) => {
        onScaleChange(scale);
    }, 100);

    topic.subscribe("ol/mapscale/changed", onChangeScale);

    display.map.olMap
        .getLayers()
        .getArray()
        .forEach((layer) => {
            if (layer.getVisible() && layer.printingCopy) {
                // Adding the same layer to different maps causes
                // infinite loading, thus we need a copy.
                printMap.addLayer(layer.printingCopy());
            }
        });

    display.map.olMap
        .getOverlays()
        .getArray()
        .forEach((overlay) => {
            if ("annPopup" in overlay && overlay.annPopup) {
                const annPopup = overlay.annPopup;
                const clonedPopup = annPopup.cloneOlPopup(
                    annPopup.getAnnFeature()
                );
                printMap.addOverlay(clonedPopup);
            }
        });

    const mapLogoEl = document.getElementsByClassName("map-logo");
    if (mapLogoEl.length > 0) {
        const olViewportEl = container.getElementsByClassName("ol-viewport")[0];
        const newLogoEl = mapLogoEl[0].cloneNode(true);
        olViewportEl.appendChild(newLogoEl);
    }

    return [printMap, mapScale];
};

interface PrintMapSettings {
    width: number;
    height: number;
    margin: number;
    scale: number;
    scaleLine: boolean;
    scaleValue: boolean;
}

interface PrintMapProps {
    settings: PrintMapSettings;
    display: any;
    onScaleChange: (scale: number) => void;
}

class PrintMapStyle {
    style: HTMLStyleElement;

    constructor() {
        this.style = document.createElement("style");
        document.body.appendChild(this.style);
    }

    private mmToPx(mm: number): number {
        // According to https://www.w3.org/TR/css3-values/#absolute-lengths
        return (mm / 10) * (96 / 2.54);
    }

    update(settings: PrintMapSettings) {
        const widthPage = Math.round(this.mmToPx(settings.width));
        const heightPage = Math.round(this.mmToPx(settings.height));
        const margin = Math.round(this.mmToPx(settings.margin));
        const widthMap = widthPage - margin * 2;
        const heightMap = heightPage - margin * 2;

        const newStyleText = buildPrintStyle({
            widthPage,
            heightPage,
            margin,
            widthMap,
            heightMap,
        });

        this.style.innerHTML = newStyleText;
    }

    clear(): void {
        if (!this.style) {
            return;
        }
        this.style.remove();
    }
}

export const PrintMap = ({
    settings,
    display,
    onScaleChange,
}: PrintMapProps) => {
    const [style, setStyle] = useState(undefined);

    const printMapRef = useRef<HTMLDivElement>(null);
    const printMap = useRef<OlMap>(undefined);
    const mapScaleControl = useRef(undefined);

    const updateScalesControls = (settings: PrintMapSettings): void => {
        if (!settings || !mapScaleControl.current) {
            return;
        }

        const element: HTMLElement = mapScaleControl.current.element;
        const classes = element.classList;
        settings.scaleLine ? classes.add("line") : classes.remove("line");
        settings.scaleValue ? classes.add("value") : classes.remove("value");
    };

    useEffect(() => {
        const printMapStyle = new PrintMapStyle();
        printMapStyle.update(settings);
        setStyle(printMapStyle);

        return () => {
            printMapStyle.clear();
            printMap.current.setTarget(null);
        };
    }, []);

    useEffect(() => {
        if (!style) {
            return;
        }
        const [map, mapScale] = buildMap(
            printMapRef.current,
            display,
            onScaleChange
        );
        printMap.current = map;
        mapScaleControl.current = mapScale;
        updateScalesControls(settings);
    }, [style]);

    useEffect(() => {
        if (!style) {
            return;
        }
        style.update(settings);

        if (printMap.current) {
            printMap.current.updateSize();
            if (settings.scale) {
                setMapScale(settings.scale, printMap.current);
            }
        }
    }, [settings]);

    useEffect(() => {
        if (!mapScaleControl.current) {
            return;
        }
        updateScalesControls(settings);
    }, [settings.scaleLine, settings.scaleValue]);

    return (
        <div className="print-map-page-wrapper">
            <div className="print-map-export-wrapper">
                <div className="print-map-page">
                    <div className="print-map" ref={printMapRef}></div>
                </div>
            </div>
        </div>
    );
};
