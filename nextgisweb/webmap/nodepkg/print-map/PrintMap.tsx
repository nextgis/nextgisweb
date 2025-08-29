import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";

import { PrintMapPreview } from "./PrintMapPreview";
import { PrintMapStyle } from "./PrintMapStyle";
import LegendPrintMap from "./legend-print-map";
import RndComp from "./rnd-comp";
import type { LegendRndCoords, PrintMapProps } from "./type";

import "./PrintMap.less";

export const PrintMap = observer<PrintMapProps>(
    ({
        display,
        settings,
        initCenter,
        printMapStore,
        onCenterChange,
        onScaleChange,
    }) => {
        const {
            width,
            height,
            margin,
            legend,
            legendColumns,
            title,
            titleText,
        } = settings;

        const settingsRef = useRef({ ...settings });
        useEffect(() => {
            settingsRef.current = { ...settings };
        }, [settings]);

        const { legendCoords, titleCoords, mapCoords } = printMapStore;

        useEffect(() => {
            printMapStore.makeLayout(settingsRef.current);
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
                        printMapStore.updateCoordinates(
                            "legendCoords",
                            rndCoords
                        );
                    }}
                />
            ),
            [legend, legendCoords, printMapStore, display]
        );

        useEffect(() => {
            printMapStore.updateColumnsCount(legendColumns);
        }, [legendColumns, printMapStore]);

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
        }, [title, titleCoords, titleText, printMapStore]);

        const mapComp = useMemo(() => {
            return (
                <RndComp
                    coords={mapCoords}
                    onChange={(rndCoords) => {
                        printMapStore.updateCoordinates("mapCoords", {
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
                            settings={settings}
                            initCenter={initCenter}
                            onCenterChange={onCenterChange}
                            onScaleChange={onScaleChange}
                        />
                    </div>
                </RndComp>
            );
        }, [
            display,
            settings,
            mapCoords,
            initCenter,
            printMapStore,
            onCenterChange,
            onScaleChange,
        ]);

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
