import { action } from "mobx";
import { Image as ImageLayer } from "ol/layer";
import { ImageWMS } from "ol/source";
import type { Options as ImageWMSOptions } from "ol/source/ImageWMS";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";

import { OlLayerAdapter } from "./OlLayerAdapter";
import type { LayerOptions } from "./OlLayerAdapter";

export default class Image extends OlLayerAdapter<
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

  @action
  override setFilter(filter: FilterExpressionString | null): void {
    super.setFilter(filter);
    this.olSource.updateParams({
      filter,
    });
  }
}
