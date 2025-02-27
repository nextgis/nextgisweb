import { fetchSettings } from "@nextgisweb/pyramid/settings";

export interface RasterLayerSettings {
    export_formats: { name: string; display_name: string }[];
    cog_enabled: boolean;
}

export default await fetchSettings<RasterLayerSettings>(COMP_ID);
