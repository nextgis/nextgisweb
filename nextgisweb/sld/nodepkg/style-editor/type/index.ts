import type { Symbolizer } from "geostyler-style";

export interface EditorProps<V extends Symbolizer = Symbolizer> {
    value: V;
    onChange?: (val: V) => void;
}
