import { Tile as TileLayer } from "ol/layer";
import { OSM as OSMSource } from "ol/source";
import type { Options as OSMSourceOptions } from "ol/source/OSM";

import { CoreLayer } from "./CoreLayer";
import type { LayerOptions } from "./CoreLayer";

export default class OSM extends CoreLayer<
    OSMSource,
    TileLayer<OSMSource>,
    OSMSourceOptions
> {
    constructor(
        name: string,
        layerOptions: LayerOptions = {},
        sourceOptions: OSMSourceOptions = {}
    ) {
        sourceOptions.url =
            sourceOptions.url ??
            // Why not default "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

        super(name, layerOptions, sourceOptions);
    }

    protected createSource(options: OSMSourceOptions): OSMSource {
        return new OSMSource(options);
    }

    protected createLayer(
        options: LayerOptions & { source: OSMSource }
    ): TileLayer<OSMSource> {
        return new TileLayer(options);
    }
}
