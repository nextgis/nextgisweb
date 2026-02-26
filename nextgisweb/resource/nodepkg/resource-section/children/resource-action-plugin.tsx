/** @plugin */
import { lazy } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { showSuccessfulDeletion } from "@nextgisweb/resource/hook/useResourceNotify";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import DataObjectIcon from "@nextgisweb/icon/material/data_object";
import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditIcon from "@nextgisweb/icon/material/edit";
import KeyIcon from "@nextgisweb/icon/material/key";

const DeletePageModalLazy = lazy(
    () => import("@nextgisweb/resource/delete-page/DeletePageModal")
);

registerResourceAction(COMP_ID, {
    key: "update",
    label: gettext("Update"),
    group: "operation",
    icon: <EditIcon />,
    order: 0,
    important: true,
    attributes: [["resource.has_permission", "resource.update"]],
    condition: (it) => it.get("resource.has_permission", "resource.update"),
    href: (it) => route("resource.update", it.id).url(),
});

registerResourceAction(COMP_ID, {
    key: "delete",
    label: gettext("Delete"),
    group: "operation",
    icon: <DeleteIcon />,
    order: 10,
    important: true,
    attributes: [["resource.is_deletable"]],
    condition: (it) => !!it.get("resource.is_deletable"),
    fastAction: ({ showModal, messageApi, item, setAttrItems }) => {
        const { destroy } = showModal(DeletePageModalLazy, {
            onCancelDelete: () => {
                destroy();
            },
            onOkDelete: () => {
                destroy();
                setAttrItems?.((old) => old.filter((x) => x.id !== item.id));
                showSuccessfulDeletion(messageApi, 1);
            },
            resources: [item.id],
        });
    },

    // widget: DeleteActionLazy,
    href: (it) => route("resource.delete", it.id).url(),
});

registerResourceAction(COMP_ID, {
    key: "effective-permissions",
    label: gettext("User permissions"),
    group: "extra",
    icon: <KeyIcon />,
    order: 0,
    attributes: [["resource.has_permission", "resource.read"]],
    condition: (it) => it.get("resource.has_permission", "resource.read"),
    href: (it) => route("resource.effective_permissions", it.id).url(),
});

registerResourceAction(COMP_ID, {
    key: "json",
    label: gettext("JSON view"),
    group: "extra",
    icon: <DataObjectIcon />,
    order: 10,
    attributes: [["resource.has_permission", "resource.read"]],
    condition: (it) => it.get("resource.has_permission", "resource.read"),
    href: (it) => route("resource.json", it.id).url(),
});
