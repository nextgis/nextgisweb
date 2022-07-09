import { routeURL } from "@nextgisweb/pyramid/api";

export function createResourceTableItemOptions(resource) {
    return {
        actions: [
            {
                href: routeURL("resource.update", resource.id),
                title: "Изменить",
                icon: "material-edit",
                key: ["operation", "10-update"],
            },
            {
                href: "",
                title: "Удалить",
                icon: "material-delete_forever",
                key: ["operation", "20-delete"],
            },
        ],
        cls: "resource_group",
        displayName: resource.displayName,
        id: resource.id,
        link: routeURL("resource.show", resource.id)
    };
}
