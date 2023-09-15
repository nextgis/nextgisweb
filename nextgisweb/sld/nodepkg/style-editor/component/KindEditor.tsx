import { gettext } from "@nextgisweb/pyramid/i18n";

import { FillEditor } from "./editor/FillEditor";
import { LineEditor } from "./editor/LineEditor";
import { MarkEditor } from "./editor/MarkEditor";

import type { Symbolizer, SymbolizerKind } from "geostyler-style";

import type { EditorProps } from "../type";

interface SymbolizerKindProps {
    symbolizer: Symbolizer;
    setSymbolizer: (val: Symbolizer) => void;
}

const componentMap: Partial<
    Record<
        SymbolizerKind,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.ComponentType<EditorProps<any>>
    >
> = {
    "Mark": MarkEditor,
    "Line": LineEditor,
    "Fill": FillEditor,
};

const unknownSymbolizerText = gettext("Symbolizer unknown!");

export function KindEditor({ symbolizer, setSymbolizer }: SymbolizerKindProps) {
    const kind = symbolizer.kind;
    const Component = componentMap[kind];

    return Component ? (
        <Component key={kind} value={symbolizer} onChange={setSymbolizer} />
    ) : (
        <>{unknownSymbolizerText}</>
    );
}
