import type { RasterSymbolizer } from "../type/Style";

export function getRasterSymbolizerValues(symbolizer: RasterSymbolizer) {
    if (!symbolizer) {
        return {
            redChannelMin: 0,
            redChannelMax: 255,
            greenChannelMin: 0,
            greenChannelMax: 255,
            blueChannelMin: 0,
            blueChannelMax: 255,
            redChannel: 0,
            greenChannel: 0,
            blueChannel: 0,
        };
    } else {
        console.log(symbolizer);
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
        return values;
    }
}
