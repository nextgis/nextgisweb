import { assert } from "@nextgisweb/jsrealm/error";
import { fetchSettings } from "@nextgisweb/pyramid/settings";

assert(COMP_ID === "panorama");

interface PanoramaSettings {
  isProviderConfigured: boolean;
}

export default await fetchSettings<PanoramaSettings>(COMP_ID);
