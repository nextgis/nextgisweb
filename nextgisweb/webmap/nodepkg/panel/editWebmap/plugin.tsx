/** @plugin */

import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import { registry } from "@nextgisweb/webmap/panel/registry";

import { WebmapEditorModal } from "./WebmapEditorModal";

registry.register(COMP_ID, {
  name: "edit-webmap",
  type: "action",
  action: ({ display, showModal }) => {
    showModal(WebmapEditorModal, { display });
  },
  isEnabled: async ({ config }) => {
    const item = await resourceAttrItem({
      resource: config.webmapId,
      attributes: [["resource.has_permission", "resource.update"]],
    });
    const isEditable = item.get("resource.has_permission", "resource.update");
    return isEditable;
  },
  title: gettext("Edit web map"),
  icon: <EditIcon />,
  order: 60,
  placement: "end",
});
