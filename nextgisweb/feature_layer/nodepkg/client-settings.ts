import { fetchSettings } from "@nextgisweb/pyramid/settings";

interface Exportformat {
    name: string;
    display_name: string;
    single_file: boolean;
    lco_configurable?: boolean | null;
    dsco_configurable?: string | null;
}

export interface FeatureLayerSettings {
    export_formats: Exportformat[];
    datatypes: string[];
}

export default await fetchSettings<FeatureLayerSettings>(COMP_ID);
