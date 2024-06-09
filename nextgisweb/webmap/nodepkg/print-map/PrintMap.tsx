import debounce from "lodash-es/debounce";
import { observer } from "mobx-react-lite";
import Map from "ol/Map";
import type OlMap from "ol/Map";
import View from "ol/View";
import { Rotate } from "ol/control";
import { defaults as defaultInteractions } from "ol/interaction";
import { useEffect, useMemo, useRef, useState } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { getLabel } from "../map-controls/map-controls";
import MapScaleControl from "../ol/ol-ext/ol-mapscale";
import type { DojoDisplay } from "../type";

import { printMapStore } from "./PrintMapStore";
import { buildPrintStyle } from "./PrintMapStyle";
import LegendPrintMap from "./legend-print-map";
import RndComp from "./rnd-comp";
import type {
    LegendRndCoords,
    PrintMapPaper,
    PrintMapProps,
    PrintMapSettings,
} from "./type";
import { mmToPx } from "./utils";

import "./PrintMap.less";

const setMapScale = (scale: number, olMap: OlMap): void => {
    const view = olMap.getView();
    const center = view.getCenter();
    if (!center) {
        return;
    }
    const cosh = (value: number) => {
        return (Math.exp(value) + Math.exp(-value)) / 2;
    };
    const pointResolution3857 = cosh(center[1] / 6378137);
    const resolution = pointResolution3857 * (scale / (96 * 39.3701));
    olMap.getView().setResolution(resolution);
};

const switchRotateControl = (olMap: OlMap, show: boolean): void => {
    const controls = olMap.getControls();
    const rotateControl = controls
        .getArray()
        .find((control) => control instanceof Rotate);

    if (!rotateControl && show) {
        const rotateControl = new Rotate({
            tipLabel: gettext("Reset rotation"),
            label: getLabel("arrow_upward"),
            autoHide: false,
        });
        olMap.addControl(rotateControl);
    }

    if (rotateControl && !show) {
        olMap.removeControl(rotateControl);
    }
};

const buildMap = (container: HTMLElement, display: DojoDisplay): OlMap => {
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
        view,
    });

    display.map.olMap
        .getLayers()
        .getArray()
        .forEach((layer) => {
            if (layer.getVisible() && (layer as any).printingCopy) {
                // Adding the same layer to different maps causes
                // infinite loading, thus we need a copy.
                printMap.addLayer((layer as any).printingCopy());
            }
        });

    display.map.olMap
        .getOverlays()
        .getArray()
        .forEach((overlay) => {
            if ("annPopup" in overlay && overlay.annPopup) {
                const annPopup = overlay.annPopup;
                const clonedPopup = (annPopup as any).cloneOlPopup(
                    (annPopup as any).getAnnFeature()
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

    return printMap;
};

class PrintMapStyle {
    style: HTMLStyleElement;

    constructor() {
        this.style = document.createElement("style");
        document.body.appendChild(this.style);
    }

    update(settings: Pick<PrintMapSettings, "width" | "height" | "margin">) {
        const widthPage = Math.round(mmToPx(settings.width));
        const heightPage = Math.round(mmToPx(Number(settings.height)));
        const margin = Math.round(mmToPx(settings.margin));
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

export const PrintMap = observer(
    ({
        settings,
        display,
        initCenter,
        onScaleChange,
        onCenterChange,
    }: PrintMapProps) => {
        const {
            width,
            height,
            margin,
            scale,
            scaleLine,
            scaleValue,
            legend,
            legendColumns,
            title,
            titleText,
            arrow,
        } = settings;

        const { legendCoords, titleCoords, mapCoords } = printMapStore;

        const printMapRef = useRef<HTMLDivElement>(null);
        const printMap = useRef<OlMap>();

        const [mapScaleControl, setMapScaleControl] =
            useState<MapScaleControl>();
        const [style, setStyle] = useState<PrintMapStyle>();

        useEffect(() => {
            const printPaper: PrintMapPaper = { width, height, margin };
            const printMapStyle = new PrintMapStyle();
            printMapStyle.update(printPaper);
            setStyle(printMapStyle);
            const shouldReset = printMapStore.updatePrintMapPaper(printPaper);
            if (shouldReset) printMapStore.makeLayout(settings);

            return () => {
                printMapStyle.clear();
            };
        }, [width, height, margin]);

        useEffect(() => {
            if (printMap.current || !printMapRef.current) return;

            const { height, width } = mapCoords;
            const isContainerReady = height && width;
            if (!isContainerReady) return;

            const map = buildMap(printMapRef.current, display);

            if (initCenter) {
                const view = map.getView();
                view.setCenter(initCenter);
            }

            const fireChangeCenter = () => {
                if (!onCenterChange) {
                    return;
                }
                const centerPrintMap = map.getView().getCenter();
                if (centerPrintMap) {
                    onCenterChange(centerPrintMap);
                }
            };

            const viewCenterChange = debounce(() => {
                fireChangeCenter();
            }, 100);
            map.getView().on("change:center", viewCenterChange);
            fireChangeCenter();

            const onChangeScale = debounce((scale: string) => {
                onScaleChange(parseInt(scale, 10));
            }, 100);

            const mapScale = new MapScaleControl({
                formatNumber: (scale) => {
                    return String(Math.round(scale / 1000) * 1000);
                },
                onChangeScale,
            });
            map.addControl(mapScale);
            printMap.current = map;
            setMapScaleControl(mapScale);
        }, [display, mapCoords]);

        useEffect(() => {
            if (printMap.current && style) {
                style.update({ width, height, margin });
                printMap.current.updateSize();
                if (scale !== undefined) {
                    setMapScale(scale, printMap.current);
                }
            }
        }, [width, height, margin, scale, style]);

        useEffect(() => {
            if (printMap.current) {
                switchRotateControl(printMap.current, arrow);
            }
        }, [arrow]);

        useEffect(() => {
            const control = mapScaleControl;
            if (control) {
                control.setScaleLineVisibility(scaleLine);
                control.setScaleValueVisibility(scaleValue);
            }
        }, [scaleLine, scaleValue, mapScaleControl]);

        const legendComp = useMemo(() => {
            if (!legend) {
                if (legendCoords.displayed) {
                    printMapStore.updateCoordinates(
                        "legendCoords",
                        {
                            ...legendCoords,
                            displayed: false,
                        },
                        settings
                    );
                }
                return null;
            }

            if (!legendCoords.displayed) {
                printMapStore.makeLayout(settings);
                return null;
            }

            return (
                <LegendPrintMap
                    dojoDisplay={display}
                    printMapStore={printMapStore}
                    legendCoords={legendCoords}
                    show={legend}
                    onChange={(rndCoords: LegendRndCoords) => {
                        printMapStore.updateCoordinates(
                            "legendCoords",
                            rndCoords,
                            settings
                        );
                    }}
                />
            );
        }, [legend, legendCoords, legendColumns]);

        useEffect(() => {
            printMapStore.updateColumnsCount(legendColumns);
        }, [legendColumns]);

        const titleComp = useMemo(() => {
            const shouldReset =
                (title && !printMapStore.titleCoords.displayed) ||
                (!title && printMapStore.titleCoords.displayed);

            if (shouldReset) {
                printMapStore.makeLayout(settings);
                return null;
            }

            if (!title) return null;

            return (
                <RndComp
                    coords={titleCoords}
                    onChange={(rndCoords) => {
                        printMapStore.updateCoordinates(
                            "titleCoords",
                            {
                                ...rndCoords,
                                displayed: true,
                            },
                            settings
                        );
                    }}
                    className="title-rnd"
                    displayed
                >
                    <div className="print-title">{titleText}</div>
                </RndComp>
            );
        }, [title, titleCoords, titleText]);

        const mapComp = useMemo(() => {
            setTimeout(() => {
                if (printMap.current) {
                    printMap.current.updateSize();
                }
            });

            return (
                <RndComp
                    coords={mapCoords}
                    onChange={(rndCoords) => {
                        printMapStore.updateCoordinates(
                            "mapCoords",
                            {
                                ...rndCoords,
                                displayed: true,
                            },
                            settings
                        );
                        if (printMap.current && style) {
                            printMap.current.updateSize();
                        }
                    }}
                    className="map-rnd"
                    displayed
                    movable={false}
                >
                    <div className="print-olmap" ref={printMapRef}></div>
                </RndComp>
            );
        }, [mapCoords]);

        if (printMap)
            return (
                <div className="print-map-page-wrapper">
                    <div className="print-map-export-wrapper">
                        <div className="print-map-page">
                            <div id="printMap" className="print-map">
                                {legendComp}
                                {titleComp}
                                {mapComp}
                            </div>
                        </div>
                    </div>
                </div>
            );
    }
);
