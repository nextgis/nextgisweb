import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";

const editMsg = i18n.gettext('Change');
const deleteMsg = i18n.gettext('Delete');

export function createResourceTableItemOptions(resource) {
    return {
        actions: [
            {
                href: routeURL("resource.update", resource.id),
                title: editMsg,
                icon: "material-edit",
                key: ["operation", "10-update"],
            },
            {
                href: "",
                title: deleteMsg,
                icon: "material-delete_forever",
                key: ["operation", "20-delete"],
            },
        ],
        cls: "resource_group",
        displayName: resource.display_name,
        id: resource.id,
        link: routeURL("resource.show", resource.id)
    };
}
