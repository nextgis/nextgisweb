import { fetchSettings } from "@nextgisweb/pyramid/settings";

export interface BasemapSettings {
    qms_geoservices_url: string;
    qms_icons_url: string;
    qms_url: string;
}

export default await fetchSettings<BasemapSettings>(COMP_ID);
