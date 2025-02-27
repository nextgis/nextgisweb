import { fetchSettings } from "@nextgisweb/pyramid/settings";
import type { ResourceExport } from "@nextgisweb/resource/type/api";

export interface ResourceSettings {
    resource_export: ResourceExport;
}

export default await fetchSettings<ResourceSettings>(COMP_ID);
