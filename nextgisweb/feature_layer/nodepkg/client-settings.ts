import { fetchSettings } from "@nextgisweb/pyramid/settings";

interface Exportformat {
    name: string;
    display_name: string;
    single_file: boolean;
    lco_configurable?: boolean | null;
    dsco_configurable?: string | null;
}

interface Versioning {
    default: boolean;
}

export interface FeatureLayerSettings {
    export_formats: Exportformat[];
    datatypes: string[];
    versioning: Versioning;
}

export default await fetchSettings<FeatureLayerSettings>(COMP_ID);
