import { action } from "mobx";
import TileLayer from "ol/layer/Tile";
import XYZSource from "ol/source/XYZ";
import type { Options as XYZSourceOptions } from "ol/source/XYZ";

import { CoreLayer } from "./CoreLayer";
import type { LayerOptions } from "./CoreLayer";

interface URLParams {
    [key: string]: string;
    resource: string;
}

export default class XYZ extends CoreLayer<
    XYZSource,
    TileLayer<XYZSource>,
    XYZSourceOptions
> {
    protected createSource(options: XYZSourceOptions): XYZSource {
        const source = new XYZSource(options);

        if (Array.isArray(this.symbols) && this.symbols.length) {
            this.updateSymbols(this.symbols);
        }

        return source;
    }

    protected createLayer(
        options: LayerOptions & { source: XYZSource }
    ): TileLayer<XYZSource> {
        return new TileLayer(options);
    }

    @action
    override setSymbols(symbols: string[]): void {
        super.setSymbols(symbols);
        this.updateSymbols(symbols);
    }

    private updateSymbols(symbols: string[]) {
        const urls = this.olSource.getUrls();
        if (urls && urls.length > 0) {
            const updatedUrls = urls.map((url) =>
                this.updateUrl(url, symbols[0])
            );
            this.olSource.setUrls(updatedUrls);
        }
    }

    private updateUrl(src: string, value: string): string {
        const url = new URL(src, window.location.href);
        const params = this.parseUrlParams(url.search);

        const resource = params["resource"];
        const symbolsKey = `symbols[${resource}]`;

        if (value) {
            params[symbolsKey] = value !== "-1" ? value : "";
        } else {
            delete params[symbolsKey];
        }

        url.search = this.buildQueryString(params);
        return url.href;
    }

    private parseUrlParams(search: string): URLParams {
        return search
            .slice(1)
            .split("&")
            .reduce<URLParams>(
                (acc, curr) => {
                    if (!curr) return acc;

                    const [key, val] = curr.split("=").map(decodeURIComponent);
                    if (key) {
                        acc[key] = val || "";
                    }
                    return acc;
                },
                { resource: "" }
            );
    }

    private buildQueryString(params: URLParams): string {
        return Object.entries(params)
            .map(([key, val]) => {
                return `${key}=${val}`;
            })
            .join("&");
    }
}
