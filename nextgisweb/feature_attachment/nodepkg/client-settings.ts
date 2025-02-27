import { fetchSettings } from "@nextgisweb/pyramid/settings";

export interface FeatureAttachmentSettings {
    webmap: {
        bundle: boolean;
    };
}

export default await fetchSettings<FeatureAttachmentSettings>(COMP_ID);
