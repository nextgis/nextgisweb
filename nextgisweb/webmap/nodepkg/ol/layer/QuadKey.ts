import { Tile as TileLayer } from "ol/layer";
import { XYZ as XYZSource } from "ol/source";
import type { Options as XYZSourceOptions } from "ol/source/XYZ";
import type { TileCoord } from "ol/tilecoord";

import { CoreLayer } from "./CoreLayer";
import type { LayerOptions } from "./CoreLayer";

function quadKey(tileCoord: TileCoord): string {
    const z = tileCoord[0];
    const digits = new Array<string>(z);
    let mask = 1 << (z - 1);

    for (let i = 0; i < z; ++i) {
        // 48 is charCode for 0 - '0'.charCodeAt(0)
        let charCode = 48;
        if (tileCoord[1] & mask) {
            charCode += 1;
        }
        if (tileCoord[2] & mask) {
            charCode += 2;
        }
        digits[i] = String.fromCharCode(charCode);
        mask >>= 1;
    }
    return digits.join("");
}

export default class QuadKey extends CoreLayer<
    XYZSource,
    TileLayer<XYZSource>,
    XYZSourceOptions
> {
    constructor(
        name: string,
        layerOptions: LayerOptions = {},
        sourceOptions: XYZSourceOptions = {}
    ) {
        super(name, layerOptions, sourceOptions);

        const source = this.olSource;
        this.olSource.setTileUrlFunction(
            (tileCoord: TileCoord | null): string | undefined => {
                if (!tileCoord) {
                    return undefined;
                }

                const quadKeyTileCoord: TileCoord = [
                    tileCoord[0],
                    tileCoord[1],
                    tileCoord[2],
                ];
                const urls = source.getUrls();

                if (!urls || urls.length === 0) {
                    return undefined;
                }

                const url = urls[0];
                return url.replace("{q}", quadKey(quadKeyTileCoord));
            }
        );
    }

    protected createSource(options: XYZSourceOptions): XYZSource {
        return new XYZSource(options);
    }

    protected createLayer(
        options: LayerOptions & { source: XYZSource }
    ): TileLayer<XYZSource> {
        return new TileLayer(options);
    }
}
