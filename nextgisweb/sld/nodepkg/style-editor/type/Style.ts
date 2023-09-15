type Color = string;
type Opacity = number;
type Size = number;

export type WellKnownName = "square" | "circle" | "triangle" | "star" | "cross";

interface Stroke {
    opacity?: Opacity;
    color?: Color;
    width?: Size;
}

interface Fill {
    opacity?: Opacity;
    color?: Color;
}

export interface Mark {
    well_known_name?: WellKnownName;
    fill?: Fill;
    stroke?: Stroke;
}

interface Graphic {
    opacity?: Opacity;
    mark?: Mark;
    size?: Size;
}

export interface PointSymbolizer {
    type: "point";
    graphic: Graphic;
}

export interface LineSymbolizer {
    type: "line";
    stroke: Stroke;
}

export interface PolygonSymbolizer {
    type: "polygon";
    stroke?: Stroke;
    fill?: Fill;
}

export type Symbolizer = PointSymbolizer | LineSymbolizer | PolygonSymbolizer;

export type SymbolizerType = Symbolizer["type"];

export interface Rule {
    symbolizers: Symbolizer[];
}

export interface Style {
    rules: Rule[];
}

export interface SLD {
    id: number;
    value: Style;
}
