import type { BandRange, SymbolizerValues } from "../RasterStyleEditor";
import type { RasterSymbolizer } from "../type/Style";

export function getRasterSymbolizerValues({
    symbolizer,
    bandRange,
}: {
    symbolizer?: RasterSymbolizer;
    bandRange: BandRange;
}): SymbolizerValues {
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
        return {
            redChannelMin:
                symbolizer.channels.red.contrast_enhancement.normalize
                    .min_value,
            redChannelMax:
                symbolizer.channels.red.contrast_enhancement.normalize
                    .max_value,
            greenChannelMin:
                symbolizer.channels.green.contrast_enhancement.normalize
                    .min_value,
            greenChannelMax:
                symbolizer.channels.green.contrast_enhancement.normalize
                    .max_value,
            blueChannelMin:
                symbolizer.channels.blue.contrast_enhancement.normalize
                    .min_value,
            blueChannelMax:
                symbolizer.channels.blue.contrast_enhancement.normalize
                    .max_value,
            redChannel: symbolizer.channels.red.source_channel - 1,
            greenChannel: symbolizer.channels.green.source_channel - 1,
            blueChannel: symbolizer.channels.blue.source_channel - 1,
        };

    }
}
