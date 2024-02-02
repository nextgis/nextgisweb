import type { BandRange, SymbolizerValues } from "../RasterStyleEditor";
import type { RasterSymbolizer } from "../type/Style";

export function getRasterSymbolizerValues(
    symbolizer: RasterSymbolizer,
    bandRange: BandRange
) {
    if (!symbolizer) {
        return {
            redChannelMin: bandRange.min,
            redChannelMax: bandRange.max,
            greenChannelMin: bandRange.min,
            greenChannelMax: bandRange.max,
            blueChannelMin: bandRange.min,
            blueChannelMax: bandRange.max,
            redChannel: 0,
            greenChannel: 0,
            blueChannel: 0,
        };
    } else {
        const values = {};
        values["redChannelMin"] =
            symbolizer.channels.red.contrast_enhancement.normalize.min_value;
        values["redChannelMax"] =
            symbolizer.channels.red.contrast_enhancement.normalize.max_value;
        values["greenChannelMin"] =
            symbolizer.channels.green.contrast_enhancement.normalize.min_value;
        values["greenChannelMax"] =
            symbolizer.channels.green.contrast_enhancement.normalize.max_value;
        values["blueChannelMin"] =
            symbolizer.channels.blue.contrast_enhancement.normalize.min_value;
        values["blueChannelMax"] =
            symbolizer.channels.blue.contrast_enhancement.normalize.max_value;
        values["redChannel"] = symbolizer.channels.red.source_channel - 1;
        values["greenChannel"] = symbolizer.channels.green.source_channel - 1;
        values["blueChannel"] = symbolizer.channels.blue.source_channel - 1;
        return values as SymbolizerValues;
    }
}
