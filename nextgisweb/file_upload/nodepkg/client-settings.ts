import { assert } from "@nextgisweb/jsrealm/error";
import { fetchSettings } from "@nextgisweb/pyramid/settings";

assert(COMP_ID === "file_upload"); // Narrow COMP_ID type
export default await fetchSettings(COMP_ID);
