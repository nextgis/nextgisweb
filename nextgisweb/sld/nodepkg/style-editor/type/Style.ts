import type { Rule, Style } from "@nextgisweb/sld/type/api";

export type Symbolizer = Rule["symbolizers"][0];

export type SymbolizerType = Exclude<Symbolizer["type"], "raster">;

export interface SLD {
    id: number;
    value: Style;
}
