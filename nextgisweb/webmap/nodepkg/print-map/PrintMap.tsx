import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import type { Display } from "../display";

import { PrintMapPreview } from "./PrintMapPreview";
import { PrintMapStyle } from "./PrintMapStyle";
import LegendPrintMap from "./legend-print-map";
import RndComp from "./rnd-comp";
import type { PrintMapStore } from "./store";
import type { LegendRndCoords, PrintMapProps } from "./type";

import "./PrintMap.less";

const MapComp = observer(
    ({
        printMapStore,
        display,
    }: {
        printMapStore: PrintMapStore;
        display: Display;
    }) => {
        const { mapCoords } = printMapStore.layout;
        if (mapCoords.width === 0 || mapCoords.height === 0) {
            return null;
        }
        return (
            <RndComp
                coords={mapCoords}
                onChange={(rndCoords) => {
                    printMapStore.layout.updateCoordinates("mapCoords", {
                        ...rndCoords,
                        displayed: true,
                    });
                }}
                className="map-rnd"
                displayed
                movable={false}
            >
                <div
                    className="print-olmap"
                    style={{ width: "100%", height: "100%" }}
                >
                    <PrintMapPreview
                        display={display}
                        printMapStore={printMapStore}
                    />
                </div>
            </RndComp>
        );
    }
);

MapComp.displayName = "MapComp";

const TitleComp = observer(
    ({ printMapStore }: { printMapStore: PrintMapStore }) => {
        const { title, titleText, layout } = printMapStore;
        if (!title) return null;
        const { titleCoords } = layout;
        return (
            <RndComp
                coords={titleCoords}
                onChange={(rndCoords) => {
                    printMapStore.layout.updateCoordinates("titleCoords", {
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
    }
);
TitleComp.displayName = "TitleComp";

const LegendComp = observer(
    ({
        printMapStore,
        display,
    }: {
        printMapStore: PrintMapStore;
        display: Display;
    }) => {
        const { legend, layout } = printMapStore;
        const { legendCoords } = layout;
        if (!legend) return null;
        return (
            <LegendPrintMap
                display={display}
                legendCoords={legendCoords}
                printMapStore={printMapStore}
                onChange={(rndCoords: LegendRndCoords) => {
                    printMapStore.layout.updateCoordinates(
                        "legendCoords",
                        rndCoords
                    );
                }}
            />
        );
    }
);
LegendComp.displayName = "LegendComp";

export const PrintMap = observer<PrintMapProps>(
    ({ display, printMapStore }) => {
        const { width, height, margin, legend, legendColumns, title } =
            printMapStore;

        useEffect(() => {
            printMapStore.layout.makeLayout({
                width,
                title,
                height,
                margin,
                legend,
                legendColumns,
            });
        }, [
            title,
            width,
            height,
            margin,
            legend,
            legendColumns,
            printMapStore,
        ]);

        useEffect(() => {
            printMapStore.layout.updateColumnsCount(legendColumns);
        }, [legendColumns, printMapStore]);

        return (
            <div className="print-map-page-wrapper">
                <PrintMapStyle width={width} height={height} margin={margin} />
                <div className="print-map-export-wrapper">
                    <div className="print-map-page">
                        <div id="printMap" className="print-map">
                            <LegendComp
                                display={display}
                                printMapStore={printMapStore}
                            />
                            <TitleComp printMapStore={printMapStore} />
                            <MapComp
                                display={display}
                                printMapStore={printMapStore}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PrintMap.displayName = "PrintMap";
