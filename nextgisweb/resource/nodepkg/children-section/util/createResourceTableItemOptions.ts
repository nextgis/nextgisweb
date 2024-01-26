import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Resource } from "../../type";
import type { ChildrenResource } from "../type";

const msgChange = gettext("Change");
const msgDelete = gettext("Delete");

export function createResourceTableItemOptions(
    resource: Resource
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
                icon: "material-delete_forever",
                key: ["operation", "20-delete"],
            },
        ],
        cls: "resource_group",
        displayName: resource.display_name,
        id: resource.id,
        link: routeURL("resource.show", resource.id),
    };
}
