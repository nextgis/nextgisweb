import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    ResourceChildItem,
    ResourceRead,
} from "@nextgisweb/resource/type/api";

const msgChange = gettext("Change");
const msgDelete = gettext("Delete");

export function createResourceTableItemOptions(
    resource: ResourceRead
): ResourceChildItem {
    return {
        actions: [
            {
                href: routeURL("resource.update", resource.id),
                title: msgChange,
                target: "_self",
                icon: "material-edit",
                key: ["operation", "10-update"],
            },
            {
                href: "",
                title: msgDelete,
                target: "_self",
                icon: "material-delete",
                key: ["operation", "20-delete"],
            },
        ],
        cls: "resource_group",
        displayName: resource.display_name,
        id: resource.id,
    };
}
