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
import { getMapScale, mmToPx, setMapScale, switchRotateControl } from "./utils";

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

const scaleFormatter = (scale: number): string => {
    if (scale <= 0) {
        throw new Error("The scale must be a positive number");
    }

    let precisionToUse: number | null = null;

    if (scale > 0 && scale < 350) {
        precisionToUse = 10;
    } else if (scale > 350 && scale < 700) {
        precisionToUse = 25;
    } else if (scale > 700 && scale < 1250) {
        precisionToUse = 50;
    } else if (scale > 1250 && scale < 3000) {
        precisionToUse = 125;
    } else if (scale > 3000 && scale < 7000) {
        precisionToUse = 250;
    } else if (scale > 7000 && scale < 15000) {
        precisionToUse = 500;
    } else if (scale > 15000 && scale < 35000) {
        precisionToUse = 1250;
    } else if (scale > 35000 && scale < 70000) {
        precisionToUse = 2500;
    } else if (scale > 70000 && scale < 120000) {
        precisionToUse = 5000;
    } else if (scale > 120000 && scale < 300000) {
        precisionToUse = 10000;
    } else if (scale > 300000 && scale < 600000) {
        precisionToUse = 25000;
    } else if (scale > 600000 && scale < 2000000) {
        precisionToUse = 50000;
    } else if (scale > 2000000 && scale < 8000000) {
        precisionToUse = 200000;
    } else if (scale > 8000000) {
        precisionToUse = 500000;
    }

    if (precisionToUse !== null) {
        const rounded = Math.round(scale / precisionToUse) * precisionToUse;
        return String(rounded);
    } else {
        return String(scale);
    }
};

export const PrintMap = observer<PrintMapProps>(
    ({
        display,
        settings,
        initCenter,
        onCenterChange,
        onScaleChange,
        onZoomChange,
    }) => {
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
        const printMap = useRef<OlMap>(null);

        const [mapScaleControl, setMapScaleControl] =
            useState<MapScaleControl>();
        const [style, setStyle] = useState<PrintMapStyle>();

        useEffect(() => {
            const printPaper: PrintMapPaper = { width, height, margin };
            const printMapStyle = new PrintMapStyle();
            printMapStyle.update(printPaper);
            setStyle(printMapStyle);
            printMapStore.makeLayout(settingsRef.current);

            return () => {
                printMapStyle.clear();
            };
        }, [width, height, margin, legend, title, legendColumns]);

        useEffect(() => {
            if (!mapReady) return;

            if (printMap.current || !printMapRef.current) return;

            const { height, width } = mapCoords;
            const isContainerReady = height && width;
            if (!isContainerReady) return;

            const map = buildPrintMap(printMapRef.current);
            const viewPrintMap = map.getView();

            if (initCenter) {
                viewPrintMap.setCenter(initCenter);
                if (scale) {
                    setMapScale(scale, map);
                    onScaleChange(scale);
                }
            } else {
                const mainMapView = display.map.olMap.getView();
                viewPrintMap.setCenter(mainMapView.getCenter());
                viewPrintMap.setZoom(mainMapView.getZoom() as number);
                const currentScale = getMapScale(display.map.olMap);
                if (currentScale) {
                    onScaleChange(currentScale);
                }
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

                const zoom = viewPrintMap.getZoom();
                if (zoom !== undefined) {
                    onZoomChange(zoom);
                }
            }, 100);

            const mapScale = new MapScaleControl({
                formatNumber: scaleFormatter,
                onChangeScale,
            });
            map.addControl(mapScale);

            setMapScaleControl(mapScale);
            switchRotateControl(map, arrow);

            printMap.current = map;
        }, [
            scale,
            arrow,
            display,
            mapReady,
            mapCoords,
            initCenter,
            onCenterChange,
            buildPrintMap,
            onScaleChange,
            onZoomChange,
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
                            rndCoords
                        );
                    }}
                />
            );
        }, [legend, legendCoords, display]);

        useEffect(() => {
            printMapStore.updateColumnsCount(legendColumns);
        }, [legendColumns]);

        const titleComp = useMemo(() => {
            if (!title) return null;
            return (
                <RndComp
                    coords={titleCoords}
                    onChange={(rndCoords) => {
                        printMapStore.updateCoordinates("titleCoords", {
                            ...rndCoords,
                            displayed: true,
                        });
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
                        printMapStore.updateCoordinates("mapCoords", {
                            ...rndCoords,
                            displayed: true,
                        });
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
        }, [mapCoords, style]);

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

PrintMap.displayName = "PrintMap";
