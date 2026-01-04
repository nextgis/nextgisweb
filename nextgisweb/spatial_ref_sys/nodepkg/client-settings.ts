import { assert } from "@nextgisweb/jsrealm/error";
import { fetchSettings } from "@nextgisweb/pyramid/settings";

assert(COMP_ID === "spatial_ref_sys"); // Narrow COMP_ID type
export default await fetchSettings(COMP_ID);
