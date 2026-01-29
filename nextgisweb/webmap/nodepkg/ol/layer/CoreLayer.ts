import { uniqueId } from "lodash-es";
import type { Layer } from "ol/layer";
import type { Source } from "ol/source";
import type { Style } from "ol/style";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";

export interface LayerOptions {
    title?: string;
    visible?: boolean;
    opacity?: number;
    maxResolution?: number;
    minResolution?: number;
    minZoom?: number;
    style?: Style;
}

export type ExtendedOlLayer<
    TSource extends Source = Source,
    TLayer extends Layer<TSource> = Layer<TSource>,
> = TLayer & { printingCopy?: () => TLayer };

/** We are using CoreLayer instead of BaseLayer here to avoid mismatch with cartographic baselayer on the bottom of map */
export abstract class CoreLayer<
    TSource extends Source = Source,
    TLayer extends ExtendedOlLayer<TSource> = ExtendedOlLayer<TSource>,
    TSourceOptions = unknown,
> {
    id = uniqueId();
    name: string;
    title: string;
    isBaseLayer = false;
    olLayer: TLayer;
    olSource: TSource;
    symbols: LayerSymbols = [];

    protected abstract createSource(options: TSourceOptions): TSource;
    protected abstract createLayer(
        options: LayerOptions & { source: TSource }
    ): TLayer;

    constructor(
        name: string,
        layerOptions: LayerOptions = {},
        sourceOptions?: TSourceOptions
    ) {
        this.name = name;
        this.title = layerOptions.title || name;

        this.olSource = this.createSource(sourceOptions as TSourceOptions);
        this.olLayer = this.createLayer({
            ...layerOptions,
            source: this.olSource,
        });

        this.olLayer.printingCopy = () => {
            const printSource = this.createSource(
                sourceOptions as TSourceOptions
            );
            const opts = {
                ...layerOptions,
                visible: this.olLayer.getVisible(),
                opacity: this.olLayer.getOpacity(),
                source: printSource,
            };
            const printLayer = this.createLayer(opts);
            this.toggleSourceBySymbols(this.symbols, printLayer, printSource);
            return printLayer;
        };

        this.setOpacity(this.olLayer.getOpacity() ?? 1);
        this.setVisibility(this.olLayer.getVisible() ?? true);

        this.bindLayerEvents();
    }

    bindLayerEvents(): void {
        this.olLayer.on("change:visible", () => {
            this.setVisibility(this.olLayer.getVisible() ?? true);
        });

        this.olLayer.on("change:opacity", () => {
            this.setOpacity(this.olLayer.getOpacity() ?? 1);
        });
    }

    setVisibility(visibility: boolean): void {
        this.olLayer.setVisible(visibility);
    }

    setOpacity(opacity: number): void {
        this.olLayer.setOpacity(opacity);
    }

    setSymbols(symbols: LayerSymbols): void {
        this.toggleSourceBySymbols(symbols, this.olLayer, this.olSource);
    }

    setFilter(_filter: FilterExpressionString | null) {
        //
    }

    setZIndex(zIndex: number) {
        this.getLayer()?.setZIndex(zIndex);
    }

    reload(): void {
        this.olSource.changed();
    }

    getLayer(): TLayer {
        return this.olLayer;
    }

    getSource(): TSource {
        return this.olSource;
    }

    dispose() {
        this.olLayer.dispose();
        this.olSource.dispose();
    }

    private toggleSourceBySymbols(
        symbols: LayerSymbols,
        layer: TLayer,
        source: TSource
    ) {
        if (symbols === "-1") {
            layer.setSource(null);
        } else {
            layer.setSource(source);
        }
    }
}
