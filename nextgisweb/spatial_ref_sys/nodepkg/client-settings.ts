import { fetchSettings } from "@nextgisweb/pyramid/settings";

export interface SpatialRefSysSettings {
    catalog: {
        coordinates_search: false;
        enabled: true;
        url: string;
    };
    default: { id: number };
}

export default await fetchSettings<SpatialRefSysSettings>(COMP_ID);
