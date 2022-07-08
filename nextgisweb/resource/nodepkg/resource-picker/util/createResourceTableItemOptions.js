export function createResourceTableItemOptions(resource) {
    return {
        actions: [
            {
                href: "",
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
    };
}
