import { action, observable } from "mobx";
import type { Layer } from "ol/layer";
import type { Source } from "ol/source";
import type { Style } from "ol/style";

import { Watchable } from "@nextgisweb/webmap/compat/Watchable";
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
    symbols: string[];
}

export abstract class BaseLayer<
    TSource extends Source = Source,
    TLayer extends Layer<TSource> = Layer<TSource>,
    TSourceOptions = unknown,
> extends Watchable<LayerWatchableProps> {
    name: string;
    title: string;
    isBaseLayer = false;
    olLayer: TLayer;
    olSource: TSource;

    @observable accessor opacity: number = 1;
    @observable accessor visibility: boolean = true;
    @observable.shallow accessor symbols: string[] = [];
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.olLayer as any).printingCopy = () => {
            const opts = {
                ...layerOptions,
                visible: this.olLayer.getVisible(),
                opacity: this.olLayer.getOpacity(),
                source: this.createSource(sourceOptions as TSourceOptions),
            };
            return this.createLayer(opts);
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
    setSymbols(symbols: string[]): void {
        const oldSymbold = this.symbols;
        if (symbols[0] === "-1") {
            this.olLayer.setSource(null);
        } else if (this.symbols[0] === "-1") {
            this.olLayer.setSource(this.olSource);
        }
        this.notify("symbols", oldSymbold, symbols);
        this.symbols = symbols;
    }

    @action
    setItemConfig(itemConfig: LayerItemConfig) {
        this.itemConfig = itemConfig;
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

    /** @deprecated use {@link _Base.setVisibility} or {@link _Base.setOpacity} or {@link _Base.setSymbols} */
    @action
    set(
        property: keyof LayerWatchableProps,
        value: boolean | number | string[]
    ): void {
        switch (property) {
            case "visibility":
                this.setVisibility(value as boolean);
                break;
            case "opacity":
                this.setOpacity(value as number);
                break;
            case "symbols":
                this.setSymbols(value as string[]);
                break;
            default:
                throw new Error(`Unknown property: ${property}`);
        }
    }

    /** @deprecated use {@link _Base.visibility}, {@link _Base.opacity}, or {@link _Base.symbols} */
    @action
    get(property: keyof LayerWatchableProps): boolean | number | string[] {
        switch (property) {
            case "visibility":
                return this.visibility;
            case "opacity":
                return this.opacity;
            case "symbols":
                return this.symbols;
            default:
                throw new Error(`Unknown property: ${property}`);
        }
    }
}