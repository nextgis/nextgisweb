/** @testentry react */
import { useEffect, useState } from "react";

import StyleEditor from "./StyleEditor";
import { SymbolizerCard } from "./component/SymbolizerCard";
import { TypeSelect } from "./component/TypeSelect";
import type { Symbolizer, SymbolizerType } from "./type/Style";
import { convertFromGeostyler } from "./util/convertFromGeostyler";
import { generateSymbolizer } from "./util/generateSymbolizer";

function StyleEditorTest() {
    const [symbolizer, setSymbolizer] = useState<Symbolizer>();
    const [type, setType] = useState<SymbolizerType>("point");

    useEffect(() => {
        const s = convertFromGeostyler(generateSymbolizer(type));
        if (s) {
            setSymbolizer(s);
        }
    }, [type]);

    return (
        <>
            <div>
                <TypeSelect value={type} onChange={setType} />
            </div>
            <div>
                <StyleEditor value={symbolizer} onChange={setSymbolizer} />
            </div>
            <p>Symbolizer:</p>
            {symbolizer && <SymbolizerCard symbolizer={symbolizer} />}
            <p>Schema:</p>
            {JSON.stringify(symbolizer, null, 2)}
        </>
    );
}

export default StyleEditorTest;
