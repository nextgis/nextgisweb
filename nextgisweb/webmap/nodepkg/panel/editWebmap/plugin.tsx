/** @plugin */

import { lazy } from "react";

import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import { registry } from "@nextgisweb/webmap/panel/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import { WebmapEditorModal } from "./WebmapEditorModal";

import SaveIcon from "@nextgisweb/icon/material/save";

const SaveWebmapButtonLazy = lazy(() => import("./SaveWebmapButton"));

async function isEnabled({ config }: { config: DisplayConfig }) {
  const item = await resourceAttrItem({
    resource: config.webmapId,
    attributes: [["resource.has_permission", "resource.update"]],
  });
  const isEditable = item.get("resource.has_permission", "resource.update");
  return isEditable;
}

registry.register(COMP_ID, {
  name: "edit-webmap",
  type: "action",
  action: ({ display, showModal }) => {
    showModal(WebmapEditorModal, { display });
  },
  isEnabled,
  title: gettext("Edit web map"),
  icon: <EditIcon />,
  order: 60,
  placement: "end",
});

registry.register(COMP_ID, {
  name: "save-webmap",
  type: "action-button",
  component: SaveWebmapButtonLazy,
  isEnabled: async ({ config, treeStore }) => {
    return treeStore.dirty && (await isEnabled({ config }));
  },
  title: gettext("Save layers configuration"),
  icon: <SaveIcon />,
  order: 50,
  placement: "end",
});
