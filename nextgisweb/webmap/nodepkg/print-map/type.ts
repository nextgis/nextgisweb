import type { Coordinate } from "ol/coordinate";

import type { DojoDisplay } from "../type";

import type { printMapStore } from "./PrintMapStore";

export interface RndCoords {
    x: number;
    y: number;
    width: number;
    height: number;
    displayed: boolean;
}

export interface LegendRndCoords extends RndCoords {
    legendColumns: number;
}

export interface LegendPrintMapProps {
    dojoDisplay: DojoDisplay;
    printMapStore: typeof printMapStore;
    legendCoords: LegendRndCoords;
    show: boolean;
    onChange: (coords: LegendRndCoords) => void;
}

export interface RndCompProps {
    children: string | JSX.Element | JSX.Element[];
    coords: RndCoords;
    displayed: boolean;
    onChange: (coords: RndCoords) => void;
    className?: string;
    movable?: boolean;
}

export interface PrintMapPaper {
    width: number;
    height: number;
    margin: number;
}

export interface PrintMapSettings extends PrintMapPaper {
    scaleLine: boolean;
    scaleValue: boolean;
    arrow: boolean;
    legend: boolean;
    legendColumns: number;
    center?: Coordinate | null;
    title?: boolean;
    titleText?: string;
    scale?: number;
}

export interface PrintMapProps {
    settings: PrintMapSettings;
    initCenter: Coordinate | null;
    display: DojoDisplay;
    onScaleChange: (scale: number) => void;
    onCenterChange: (center: Coordinate) => void;
}
