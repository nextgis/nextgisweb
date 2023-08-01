declare module "@nextgisweb/resource/type/Resource" {
    export interface ResourceItem {
        feature_layer: import("./type/FeatureLayer").FeatureLayer;
    }
}

declare module "@nextgisweb/pyramid/settings!feature_layer" {
    interface Exportformat {
        name: string;
        display_name: string;
        single_file: boolean;
        lco_configurable?: boolean | null;
        dsco_configurable?: boolean | null;
    }

    interface Editorwidget {
        description: string;
        attachment: string;
    }

    interface FeatureLayerSettings {
        editor_widget: Editorwidget;
        extensions: Editorwidget;
        export_formats: Exportformat[];
        datatypes: string[];
    }

    const value: FeatureLayerSettings;
    export = value;
}
