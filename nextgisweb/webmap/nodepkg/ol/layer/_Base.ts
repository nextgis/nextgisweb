import { action, observable } from "mobx";
import type { Layer } from "ol/layer";
import type { Source } from "ol/source";

export interface LayerOptions {
    title?: string;
    visible?: boolean;
    opacity?: number;
}

export interface SourceOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export abstract class BaseLayer<
    TSource extends Source = Source,
    TLayer extends Layer<TSource> = Layer<TSource>,
> {
    name: string;
    title: string;
    isBaseLayer = false;
    olLayer: TLayer;
    olSource: TSource;

    @observable accessor opacity: number = 1;
    @observable accessor visibility: boolean = true;
    @observable accessor symbols: string[] = [];

    protected abstract createSource(options: SourceOptions): TSource;
    protected abstract createLayer(
        options: LayerOptions & { source: TSource }
    ): TLayer;

    constructor(
        name: string,
        layerOptions: LayerOptions = {},
        sourceOptions: SourceOptions = {}
    ) {
        this.name = name;
        this.title = layerOptions.title || name;

        this.olSource = this.createSource(sourceOptions);
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
                source: this.createSource(sourceOptions),
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
            this.visibility = visibility;
            this.olLayer.setVisible(visibility);
        }
    }

    @action
    setOpacity(opacity: number): void {
        if (this.opacity !== opacity) {
            this.opacity = opacity;
            this.olLayer.setOpacity(opacity);
        }
    }

    @action
    setSymbols(symbols: string[]): void {
        if (symbols[0] === "-1") {
            this.olLayer.setSource(null);
        } else if (this.symbols[0] === "-1") {
            this.olLayer.setSource(this.olSource);
        }
        this.symbols = symbols;
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
}
