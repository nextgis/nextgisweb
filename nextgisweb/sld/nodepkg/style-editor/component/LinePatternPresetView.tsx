import type { Symbolizer as GSSymbolizer } from "geostyler-style";

import "./LinePatternPresetView.css";
import { OlRenderer } from "./OlRenderer";

export const LinePatternPresetView = ({ presetData }: { presetData: any }) => {
    return (
        <div className="line-preset-wrapper">
            <div className="dash-sample-wrapper">
                <OlRenderer symbolizers={[presetData.value as GSSymbolizer]} />
            </div>
            <span>{presetData.displayName}</span>
        </div>
    );
};
