import type { WebMapCSettingsRead } from "@nextgisweb/webmap/type/api";

interface BaseMap {
    base: {
        keyname: string;
        mid: string;
    };
    layer: {
        title: string;
        visible?: boolean;
    };
    source: Record<string, unknown>;
}

interface Adapters {
    tile: {
        display_name: string;
    };
    image: {
        display_name: string;
    };
}

export interface WebMapSettings extends WebMapCSettingsRead {
    basemaps: BaseMap[];
    editing: boolean;
    annotation: boolean;
    adapters: Adapters;
    check_origin: boolean;
}
