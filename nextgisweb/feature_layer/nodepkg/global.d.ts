declare module "@nextgisweb/pyramid/settings!feature_layer" {
    interface Exportformat {
        name: string;
        display_name: string;
        single_file: boolean;
        lco_configurable?: boolean | null;
        dsco_configurable?: string | null;
    }

    export interface Editorwidget {
        description: string;
        attachment: string;
    }

    interface FeatureLayerSettings {
        editor_widget: Editorwidget;
        extensions: Editorwidget;
        extensions_comp: Editorwidget;
        export_formats: Exportformat[];
        datatypes: string[];
    }

    const value: FeatureLayerSettings;
    export = value;
}
