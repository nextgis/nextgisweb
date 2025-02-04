import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import type OlMap from "ol/Map";
import { useEffect, useMemo, useRef, useState } from "react";

import MapScaleControl from "../ol-ext/ol-mapscale";

import { printMapStore } from "./PrintMapStore";
import { buildPrintStyle } from "./PrintMapStyle";
import { usePrintMap } from "./hook/usePrintMap";
import LegendPrintMap from "./legend-print-map";
import RndComp from "./rnd-comp";
import type {
    LegendRndCoords,
    PrintMapPaper,
    PrintMapProps,
    PrintMapSettings,
} from "./type";
import { mmToPx, setMapScale, switchRotateControl } from "./utils";

import "./PrintMap.less";

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

export const PrintMap = observer<PrintMapProps>(
    ({ settings, display, initCenter, onScaleChange, onCenterChange }) => {
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
        const { mapReady } = display;
        const { buildPrintMap } = usePrintMap({ display });

        const settingsRef = useRef({ ...settings });

        useEffect(() => {
            settingsRef.current = { ...settings };
        }, [settings]);

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
            if (shouldReset) printMapStore.makeLayout(settingsRef.current);

            return () => {
                printMapStyle.clear();
            };
        }, [width, height, margin]);

        useEffect(() => {
            if (!mapReady) return;

            if (printMap.current || !printMapRef.current) return;

            const { height, width } = mapCoords;
            const isContainerReady = height && width;
            if (!isContainerReady) return;

            const map = buildPrintMap(printMapRef.current);

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
        }, [
            mapReady,
            mapCoords,
            initCenter,
            buildPrintMap,
            onScaleChange,
            onCenterChange,
        ]);

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

        useEffect(() => {
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
            }
        }, [legend, legendCoords, legendCoords.displayed, settings]);
        useEffect(() => {
            const shouldReset =
                (title && !printMapStore.titleCoords.displayed) ||
                (!title && printMapStore.titleCoords.displayed) ||
                !legendCoords.displayed;

            if (shouldReset) {
                printMapStore.makeLayout(settingsRef.current);
            }
        }, [legendCoords.displayed, title]);

        const legendComp = useMemo(() => {
            return (
                <LegendPrintMap
                    display={display}
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
        }, [legend, legendCoords, display, settings]);

        useEffect(() => {
            printMapStore.updateColumnsCount(legendColumns);
        }, [legendColumns]);

        const titleComp = useMemo(() => {
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
        }, [settings, title, titleCoords, titleText]);

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
        }, [mapCoords, settings, style]);

        if (printMap) {
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
        return null;
    }
);

PrintMap.displayName = "PrintMap";
