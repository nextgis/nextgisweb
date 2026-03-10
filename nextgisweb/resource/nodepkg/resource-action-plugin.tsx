/** @plugin */
import { lazy } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { showSuccessfulDeletion } from "@nextgisweb/resource/hook/useResourceNotify";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import { ResourceActionModal } from "./component/ResourceActionModal";

import DataObjectIcon from "@nextgisweb/icon/material/data_object";
import DeleteIcon from "@nextgisweb/icon/material/delete";
import EditIcon from "@nextgisweb/icon/material/edit";
import KeyIcon from "@nextgisweb/icon/material/key";

const JsonViewLazy = lazy(() => import("@nextgisweb/resource/json-view"));

const EffectivePermissionsLazy = lazy(
  () => import("@nextgisweb/resource/effective-permissions")
);

const DeletePageModalLazy = lazy(
  () => import("@nextgisweb/resource/delete-page/DeletePageModal")
);

registerResourceAction(COMP_ID, {
  key: "update",
  label: gettext("Update"),
  menu: { group: "resource", order: 40 },
  icon: <EditIcon />,
  quick: { order: 80 },
  attributes: [["resource.has_permission", "resource.update"]],
  condition: (it) => it.get("resource.has_permission", "resource.update"),
  href: (it) => route("resource.update", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "delete",
  label: gettext("Delete"),
  menu: {
    group: "resource",
    order: 80,
  },
  icon: <DeleteIcon />,
  attributes: [
    ["resource.is_deletable"],
    ["resource.has_permission", "resource.delete"],
  ],
  condition: (it) =>
    it.get("resource.is_deletable") &&
    it.get("resource.has_permission", "resource.delete"),
  run: ({ showModal, messageApi, item, setAttrItems }) => {
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
  href: (it) => route("resource.delete", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "effective-permissions",
  label: gettext("User permissions"),
  menu: {
    group: "extra",
  },
  icon: <KeyIcon />,
  attributes: [["resource.has_permission", "resource.read"]],
  run: ({ showModal, item }) => {
    showModal(() => (
      <ResourceActionModal
        fullHeight
        title={gettext("User permissions")}
        href={route("resource.effective_permissions", item.id).url()}
      >
        <EffectivePermissionsLazy resourceId={item.id} />
      </ResourceActionModal>
    ));
  },
  condition: (it) => it.get("resource.has_permission", "resource.read"),
  href: (it) => route("resource.effective_permissions", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "json",
  label: gettext("JSON view"),
  menu: {
    group: "extra",
  },
  icon: <DataObjectIcon />,
  attributes: [["resource.has_permission", "resource.read"]],
  run: ({ showModal, item }) => {
    showModal(() => (
      <ResourceActionModal
        fullHeight
        title={gettext("JSON view")}
        href={route("resource.json", item.id).url()}
      >
        <JsonViewLazy id={item.id} />
      </ResourceActionModal>
    ));
  },
  condition: (it) => it.get("resource.has_permission", "resource.read"),
  href: (it) => route("resource.json", it.id).url(),
});
