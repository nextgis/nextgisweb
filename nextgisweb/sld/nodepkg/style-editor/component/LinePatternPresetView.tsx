import type { Symbolizer as GSSymbolizer } from "geostyler-style";

import "./LinePatternPresetView.css";
import { OlRenderer } from "./OlRenderer";

export const LinePatternPresetView = ({
    presetData,
    width = 2,
}: {
    presetData: any;
    width: number;
}) => {
    return (
        <div className="line-preset-wrapper">
            <div className="dash-sample-wrapper">
                <OlRenderer
                    symbolizers={[
                        {
                            ...presetData.value,
                            cap: "butt",
                            kind: "Line",
                            width,
                        } as GSSymbolizer,
                    ]}
                />
            </div>
            <span>{presetData.displayName}</span>
        </div>
    );
};
