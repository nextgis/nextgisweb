import type { Symbolizer as GSSymbolizer } from "geostyler-style";
import { useCallback, useEffect } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";

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
    const getSymbolizer = useCallback(
        () =>
            (value && convertToGeostyler(value)) ||
            generateSymbolizer(initType),
        [value, initType]
    );

    const [symbolizer, setSymbolizer] = useObjectState<GSSymbolizer>(
        getSymbolizer,
        { ignoreUndefined: true }
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
