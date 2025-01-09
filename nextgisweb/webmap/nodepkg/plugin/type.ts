export interface FeatureLayerWebMapPluginConfig {
    likeSearch: boolean;
    readonly: boolean;
}
export interface DescriptionWebMapPluginConfig {
    description: string | null;
}
export interface LayerEditorWebMapPluginConfig {
    writable: boolean;
    geometry_type: string;
}
declare module "@nextgisweb/webmap/type/TreeItems" {
    interface PluginConfig {
        "@nextgisweb/webmap/plugin/feature-layer": FeatureLayerWebMapPluginConfig;
        "@nextgisweb/webmap/plugin/layer-editor": LayerEditorWebMapPluginConfig;
        "@nextgisweb/webmap/plugin/layer-info": DescriptionWebMapPluginConfig;
        "@nextgisweb/webmap/plugin/layer-opacity": Record<string, never>;
        "@nextgisweb/webmap/plugin/zoom-to-layer": Record<string, never>;
        "@nextgisweb/webmap/plugin/zoom-to-webmap": Record<string, never>;
        "@nextgisweb/feature-attachment/attachment-bundle/plugin": Record<
            string,
            never
        >;
        "@nextgisweb/basemap/plugin/base-map": {
            basemaps: Array<{
                url: string;
                qms: string | null;
                copyright_text: string | null;
                copyright_url: string | null;
                resource_id: number;
                position: number;
                display_name: string;
                enabled: boolean;
                opacity: number | null;
            }>;
        };
    }
}
