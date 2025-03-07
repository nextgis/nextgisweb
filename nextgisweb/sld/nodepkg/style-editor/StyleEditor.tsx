import type { Symbolizer as GSSymbolizer } from "geostyler-style";
import { useEffect, useState } from "react";

import { KindEditor } from "./component/KindEditor";
import type { Symbolizer, SymbolizerType } from "./type/Style";
import { convertFromGeostyler } from "./util/convertFromGeostyler";
import { convertToGeostyler } from "./util/convertToGeostyler";
import { generateSymbolizer } from "./util/generateSymbolizer";

export interface StyleEditorProps {
    value?: Symbolizer;
    onChange?: (val: Symbolizer) => void;
    initType?: SymbolizerType;
}

export function StyleEditor({
    value,
    onChange: onSymbolizerChange,
    initType = "point",
}: StyleEditorProps) {
    const [symbolizer, setSymbolizer] = useState<GSSymbolizer>(
        () =>
            (value && convertToGeostyler(value)) || generateSymbolizer(initType)
    );

    useEffect(() => {
        if (onSymbolizerChange && symbolizer) {
            const style = convertFromGeostyler(symbolizer);
            if (style) {
                onSymbolizerChange(style);
            }
        }
    }, [symbolizer, onSymbolizerChange]);

    return (
        <div className="ngw-sld-style-editor">
            <KindEditor symbolizer={symbolizer} setSymbolizer={setSymbolizer} />
        </div>
    );
}

export default StyleEditor;
