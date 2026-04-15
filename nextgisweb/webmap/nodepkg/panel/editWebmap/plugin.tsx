/** @plugin */

import { EditIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resourceAttrItem } from "@nextgisweb/resource/api/resource-attr";
import { registry } from "@nextgisweb/webmap/panel/registry";

registry.register(COMP_ID, {
  type: "action",
  action: ({ display }) => {
    const editUrl = routeURL("resource.update", display.config.webmapId);
    window.open(editUrl, "_blank");
  },
  name: "edit-webmap",
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
