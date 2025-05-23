import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceRead } from "@nextgisweb/resource/type/api";

import type { ChildrenResource } from "../type";

const msgChange = gettext("Change");
const msgDelete = gettext("Delete");

export function createResourceTableItemOptions(
    resource: ResourceRead
): ChildrenResource {
    return {
        actions: [
            {
                href: routeURL("resource.update", resource.id),
                title: msgChange,
                icon: "material-edit",
                key: ["operation", "10-update"],
            },
            {
                href: "",
                title: msgDelete,
                icon: "material-delete",
                key: ["operation", "20-delete"],
            },
        ],
        cls: "resource_group",
        displayName: resource.display_name,
        id: resource.id,
    };
}
