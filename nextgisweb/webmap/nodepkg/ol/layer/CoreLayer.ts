import { action, observable } from "mobx";
import type { Layer } from "ol/layer";
import type { Source } from "ol/source";
import type { Style } from "ol/style";

import { Watchable } from "@nextgisweb/webmap/compat/Watchable";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

export interface LayerOptions {
    title?: string;
    visible?: boolean;
    opacity?: number;
    maxResolution?: number;
    minResolution?: number;
    style?: Style;
}

interface LayerWatchableProps {
    opacity: number;
    visibility: boolean;
    symbols: LayerSymbols;
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
> extends Watchable<LayerWatchableProps> {
    name: string;
    title: string;
    isBaseLayer = false;
    olLayer: TLayer;
    olSource: TSource;

    @observable.ref accessor opacity: number = 1;
    @observable.ref accessor visibility: boolean = true;
    @observable accessor symbols: LayerSymbols = [];
    @observable.shallow accessor itemConfig: LayerItemConfig | null = null;

    protected abstract createSource(options: TSourceOptions): TSource;
    protected abstract createLayer(
        options: LayerOptions & { source: TSource }
    ): TLayer;

    constructor(
        name: string,
        layerOptions: LayerOptions = {},
        sourceOptions?: TSourceOptions
    ) {
        super();
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

    @action
    setVisibility(visibility: boolean): void {
        if (this.visibility !== visibility) {
            const oldVisibility = this.visibility;
            this.visibility = visibility;
            this.olLayer.setVisible(visibility);
            this.notify("visibility", oldVisibility, visibility);
        }
    }

    @action
    setOpacity(opacity: number): void {
        if (this.opacity !== opacity) {
            const oldOpacity = this.opacity;
            this.opacity = opacity;
            this.olLayer.setOpacity(opacity);
            this.notify("opacity", oldOpacity, opacity);
        }
    }

    @action
    setSymbols(symbols: LayerSymbols): void {
        const oldSymbold = this.symbols;
        this.toggleSourceBySymbols(symbols, this.olLayer, this.olSource);
        this.notify("symbols", oldSymbold, symbols);
        this.symbols = symbols;
    }

    @action
    setItemConfig(itemConfig: LayerItemConfig) {
        this.itemConfig = itemConfig;
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

    /** @deprecated use {@link _Base.setVisibility} or {@link _Base.setOpacity} or {@link _Base.setSymbols} */
    @action
    set(
        property: keyof LayerWatchableProps,
        value: boolean | number | LayerSymbols
    ): void {
        switch (property) {
            case "visibility":
                this.setVisibility(value as boolean);
                break;
            case "opacity":
                this.setOpacity(value as number);
                break;
            case "symbols":
                this.setSymbols(value as LayerSymbols);
                break;
            default:
                throw new Error(`Unknown property: ${property}`);
        }
    }

    /** @deprecated use {@link CoreLayer.visibility}, {@link CoreLayer.opacity}, or {@link CoreLayer.symbols} */
    @action
    get<K extends keyof LayerWatchableProps>(
        property: K
    ): LayerWatchableProps[K] {
        switch (property) {
            case "visibility":
                return this.visibility as LayerWatchableProps[K];
            case "opacity":
                return this.opacity as LayerWatchableProps[K];
            case "symbols":
                return this.symbols as LayerWatchableProps[K];
            default:
                throw new Error(`Unknown property: ${property}`);
        }
    }

    private toggleSourceBySymbols(
        symbols: LayerSymbols,
        layer: TLayer,
        source: TSource
    ) {
        if (symbols === "-1") {
            layer.setSource(null);
        } else if (this.symbols === "-1") {
            layer.setSource(source);
        }
    }
}
