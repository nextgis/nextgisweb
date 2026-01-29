import TileLayer from "ol/layer/Tile";
import XYZSource from "ol/source/XYZ";
import type { Options as XYZSourceOptions } from "ol/source/XYZ";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";

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
        this.updateSymbols(this.symbols);
        return source;
    }

    protected createLayer(
        options: LayerOptions & { source: XYZSource }
    ): TileLayer<XYZSource> {
        return new TileLayer(options);
    }

    override setSymbols(symbols: LayerSymbols): void {
        super.setSymbols(symbols);
        this.updateSymbols(symbols);
    }

    override setFilter(filter: FilterExpressionString | null): void {
        super.setFilter(filter);

        const urls = this.olSource.getUrls();
        if (urls && urls.length > 0) {
            const updatedUrls = urls.map((url) =>
                this.updateUrlParam(url, "filter", filter)
            );
            this.olSource.setUrls(updatedUrls);
        }
    }

    private updateSymbols(symbols: LayerSymbols) {
        const val =
            Array.isArray(symbols) && symbols.length ? symbols.join(",") : null;
        if (val) {
            const urls = this.olSource.getUrls();
            if (urls && urls.length > 0) {
                const updatedUrls = urls.map((url) =>
                    this.updateUrlParam(url, "symbols", val, (v) =>
                        v !== "-1" ? v : ""
                    )
                );
                this.olSource.setUrls(updatedUrls);
            }
        }
    }

    private updateUrlParam(
        src: string,
        param: string,
        value: string | null | undefined,
        normalize?: (v: string) => string | null
    ): string {
        const url = new URL(src, window.location.href);
        const params = this.parseUrlParams(url.search);

        const resource = params["resource"];
        const key = `${param}[${resource}]`;

        const finalValue = normalize ? normalize(value ?? "") : value;

        if (finalValue) {
            params[key] = finalValue;
        } else {
            delete params[key];
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

                    const i = curr.indexOf("=");

                    if (i !== -1) {
                        const key = decodeURIComponent(curr.slice(0, i));
                        const val = decodeURIComponent(curr.slice(i + 1));
                        acc[key] = val;
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
