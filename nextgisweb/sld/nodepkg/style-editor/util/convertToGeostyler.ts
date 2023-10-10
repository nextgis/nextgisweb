import type {
    FillSymbolizer as GSFillSymbolizer,
    LineSymbolizer as GSLineSymbolizer,
    MarkSymbolizer as GSMarkSymbolizer,
    Symbolizer as GSSymbolizer,
    WellKnownName as GSWellKnownName,
} from "geostyler-style";

import { deepCleanUndefined } from "@nextgisweb/gui/util/deepCleanUndefined";

import type {
    LineSymbolizer,
    PointSymbolizer,
    PolygonSymbolizer,
    Symbolizer,
} from "../type/Style";

function reverseConvertMarkSymbolizer(
    symbolizer: PointSymbolizer
): GSMarkSymbolizer {
    const { graphic } = symbolizer;
    const { mark, opacity, size } = graphic;

    const wellKnownName: GSWellKnownName = mark?.well_known_name ?? "circle";
    const markSymbolizer: GSMarkSymbolizer = {
        kind: "Mark",
        wellKnownName,
        opacity,
        radius: size ? size / 2 : undefined,
    };

    if (mark) {
        const { fill, stroke } = mark;
        markSymbolizer.color = fill?.color;
        markSymbolizer.fillOpacity = fill?.opacity;

        markSymbolizer.strokeColor = stroke?.color;
        markSymbolizer.strokeOpacity = stroke?.opacity;
        markSymbolizer.strokeWidth = stroke?.width;
    }

    return markSymbolizer;
}

function reverseConvertLineSymbolizer(
    symbolizer: LineSymbolizer
): GSLineSymbolizer {
    const { stroke } = symbolizer;
    return {
        kind: "Line",
        color: stroke.color,
        width: stroke.width,
        opacity: stroke.opacity,
    };
}

function reverseConvertFillSymbolizer(
    symbolizer: PolygonSymbolizer
): GSFillSymbolizer {
    const { fill, stroke } = symbolizer;
    return {
        kind: "Fill",
        color: fill?.color,
        opacity: fill?.opacity,
        fillOpacity: fill?.opacity,
        outlineColor: stroke?.color,
        outlineOpacity: stroke?.opacity,
        outlineWidth: stroke?.width,
    };
}

export function convertToGeostyler(
    symbolizer: Symbolizer
): GSSymbolizer | null {
    switch (symbolizer.type) {
        case "point":
            return deepCleanUndefined(reverseConvertMarkSymbolizer(symbolizer));
        case "line":
            return deepCleanUndefined(reverseConvertLineSymbolizer(symbolizer));
        case "polygon":
            return deepCleanUndefined(reverseConvertFillSymbolizer(symbolizer));
        default:
            return null;
    }
}
