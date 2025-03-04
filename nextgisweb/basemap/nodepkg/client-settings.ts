import { fetchSettings } from "@nextgisweb/pyramid/settings";

import type { BasemapConfig } from "./layer-widget/type";

export interface BasemapSettings {
    basemaps: BasemapConfig[];
    qms_geoservices_url: string;
    qms_icons_url: string;
    qms_url: string;
}

export default await fetchSettings<BasemapSettings>(COMP_ID);
