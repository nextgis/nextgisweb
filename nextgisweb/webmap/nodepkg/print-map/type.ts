import type { Coordinate } from "ol/coordinate";

import type { Display } from "../display";

import type { PrintMapStore } from "./store";

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
    display: Display;
    printMapStore: PrintMapStore;
    legendCoords: LegendRndCoords;
    onChange: (coords: LegendRndCoords) => void;
}

export interface RndCompProps {
    children: string | React.ReactElement | React.ReactElement[];
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
    scale?: number;
    arrow: boolean;
    title?: boolean;
    legend: boolean;
    graticule?: boolean;
    center?: Coordinate | null;
    titleText?: string;
    scaleLine: boolean;
    scaleValue: boolean;
    legendColumns: number;
}

export interface PrintMapProps {
    printMapStore: PrintMapStore;
    display: Display;
}
