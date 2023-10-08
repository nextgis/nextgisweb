import type { Symbolizer, SymbolizerKind } from "geostyler-style";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { EditorProps } from "../type";

import { FillEditor } from "./editor/FillEditor";
import { LineEditor } from "./editor/LineEditor";
import { MarkEditor } from "./editor/MarkEditor";

interface SymbolizerKindProps {
    symbolizer: Symbolizer;
    setSymbolizer: (val: Symbolizer) => void;
}

const componentMap: Partial<
    Record<
        SymbolizerKind,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.FC<EditorProps<any>>
    >
> = {
    "Mark": MarkEditor,
    "Line": LineEditor,
    "Fill": FillEditor,
};

const msgUnknownSymbolizer = gettext("Symbolizer unknown!");

export function KindEditor({ symbolizer, setSymbolizer }: SymbolizerKindProps) {
    const kind = symbolizer.kind;
    const Component = componentMap[kind];

    if (Component) {
        return (
            <Component key={kind} value={symbolizer} onChange={setSymbolizer} />
        );
    }
    return <>{msgUnknownSymbolizer}</>;
}
