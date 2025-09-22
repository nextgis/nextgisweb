import { observer } from "mobx-react-lite";
import { useEffect, useMemo } from "react";

import { PrintMapPreview } from "./PrintMapPreview";
import { PrintMapStyle } from "./PrintMapStyle";
import LegendPrintMap from "./legend-print-map";
import RndComp from "./rnd-comp";
import type { LegendRndCoords, PrintMapProps } from "./type";

import "./PrintMap.less";

export const PrintMap = observer<PrintMapProps>(
    ({ display, printMapStore }) => {
        const {
            width,
            height,
            margin,
            legend,
            legendColumns,
            title,
            titleText,
        } = printMapStore;

        const { legendCoords, titleCoords, mapCoords } = printMapStore.layout;

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

        const legendComp = useMemo(
            () => (
                <LegendPrintMap
                    show={legend}
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
            ),
            [legend, legendCoords, printMapStore, display]
        );

        useEffect(() => {
            printMapStore.layout.updateColumnsCount(legendColumns);
        }, [legendColumns, printMapStore]);

        const titleComp = useMemo(() => {
            if (!title) return null;
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
        }, [title, titleCoords, titleText, printMapStore]);

        const mapComp = useMemo(() => {
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
        }, [display, mapCoords, printMapStore]);

        return (
            <div className="print-map-page-wrapper">
                <PrintMapStyle width={width} height={height} margin={margin} />
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
