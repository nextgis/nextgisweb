import { action } from "mobx";
import { Image as ImageLayer } from "ol/layer";
import { ImageWMS } from "ol/source";
import type { Options as ImageWMSOptions } from "ol/source/ImageWMS";

import { CoreLayer } from "./CoreLayer";
import type { LayerOptions } from "./CoreLayer";

export default class Image extends CoreLayer<
    ImageWMS,
    ImageLayer<ImageWMS>,
    ImageWMSOptions
> {
    protected createSource(options: ImageWMSOptions): ImageWMS {
        const source = new ImageWMS(options);
        if (Array.isArray(this.symbols) && this.symbols.length) {
            source.updateParams({
                symbols: this.symbols,
            });
        }
        return source;
    }

    protected createLayer(
        options: LayerOptions & { source: ImageWMS }
    ): ImageLayer<ImageWMS> {
        return new ImageLayer(options);
    }

    @action
    override setSymbols(symbols: string[]): void {
        super.setSymbols(symbols);
        this.olSource.updateParams({
            symbols,
        });
    }
}
