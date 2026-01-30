/** @plugin */
import { lazy } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditIcon from "@nextgisweb/icon/material/edit";

const DeleteActionLazy = lazy(() => import("./action/DeleteAction"));

registerResourceAction(COMP_ID, {
    key: "delete",
    label: gettext("Delete"),
    icon: <DeleteIcon />,
    order: 0,
    attributes: [["resource.is_deletable"]],
    condition: ({ it }) => !!it.get("resource.is_deletable"),
    widget: DeleteActionLazy,
});

registerResourceAction(COMP_ID, {
    key: "update",
    label: gettext("Update"),
    icon: <EditIcon />,
    order: 10,
    attributes: [["resource.has_permission", "resource.update"]],
    condition: ({ it }) =>
        !!it.get("resource.has_permission", "resource.update"),
    href: ({ it }) => route("resource.update", it.id).url(),
});
