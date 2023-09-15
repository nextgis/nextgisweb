import type {
    FillSymbolizer,
    LineSymbolizer,
    MarkSymbolizer,
    Symbolizer,
} from "geostyler-style";

interface KindParams {
    "Mark": MarkSymbolizer;
    "Fill": FillSymbolizer;
    "Line": LineSymbolizer;
    "point": MarkSymbolizer;
    "polygon": FillSymbolizer;
    "line": LineSymbolizer;
}

const markSymbolizer: MarkSymbolizer = {
    kind: "Mark",
    wellKnownName: "circle",
    color: "#0E1058",
    radius: 6,
};

const fillSymbolizer: FillSymbolizer = {
    kind: "Fill",
    color: "#0E1058",
};

const lineSymbolizer: LineSymbolizer = {
    kind: "Line",
    color: "#0E1058",
    width: 3,
};

const defaultSymbolizer: Symbolizer = markSymbolizer;

/**
 * Generates a symbolizer (with kind Mark with wellknownName Circle if none provided).
 * @param {SymbolizerKind} kind An optional SymbolizerKind
 * @param {object} values Optional values
 */
export function generateSymbolizer<K extends keyof KindParams>(
    kind?: K,
    values?: KindParams[K]
): Symbolizer {
    switch (kind) {
        case "Mark":
        case "point":
            return {
                ...markSymbolizer,
                ...values,
            };
        case "Fill":
        case "polygon":
            return {
                ...fillSymbolizer,
                ...values,
            };
        case "Line":
        case "line":
            return {
                ...lineSymbolizer,
                ...values,
            };

        default:
            return {
                ...defaultSymbolizer,
                ...values,
            } as Symbolizer;
    }
}
