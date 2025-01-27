import type { BasemapLayerRead } from "@nextgisweb/basemap/type/api";

interface BasemapConfig extends BasemapLayerRead {
    keyname: string;
    display_name: string;

    opacity?: number;
    enabled?: boolean;
}

export interface WebmapPluginConfig {
    [name: string]: Record<string, any>;
    basemaps: BasemapConfig[];
}

export type Entrypoint =
    | string
    | [midKey: string, loader: () => Promise<{ default: any }>];
export interface Mid {
    adapter: Entrypoint[];
    basemap: Entrypoint[];
    plugin: Entrypoint[];
}
