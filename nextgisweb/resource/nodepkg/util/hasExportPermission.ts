import settings from "@nextgisweb/resource/client-settings";

import type { ResourceItemWithKeys } from "../api/ResourceAttrItem";
import type { Attributes } from "../api/resource-attr";

const { resourceExport } = settings;

const isUserAdministrator = ngwConfig.isAdministrator;

export function hasExportPermission<A extends Attributes>(
    item: ResourceItemWithKeys<"resource.has_permission", A>
) {
    if (isUserAdministrator) {
        return true;
    }
    if (
        resourceExport === "data_write" &&
        item.get("resource.has_permission", "data.write")
    ) {
        return true;
    } else if (
        resourceExport === "data_read" &&
        item.get("resource.has_permission", "data.read")
    ) {
        return true;
    }
    return false;
}
