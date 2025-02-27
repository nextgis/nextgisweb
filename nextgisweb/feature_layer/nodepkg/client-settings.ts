import { fetchSettings } from "@nextgisweb/pyramid/settings";

interface Exportformat {
    name: string;
    display_name: string;
    single_file: boolean;
    lco_configurable?: boolean | null;
    dsco_configurable?: string | null;
}

interface EditorWidget {
    description: string;
    attachment: string;
}

export interface FeatureLayerSettings {
    editor_widget: EditorWidget;
    extensions: EditorWidget;
    extensions_comp: EditorWidget;
    export_formats: Exportformat[];
    datatypes: string[];
}

export default await fetchSettings<FeatureLayerSettings>(COMP_ID);
