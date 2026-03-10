/** @plugin */

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import AttachFileIcon from "@nextgisweb/icon/material/attach_file";

registerResourceAction(COMP_ID, {
  key: "feature_attachment",
  label: gettext("Manage attachments"),
  menu: { group: "feature_layer", order: 80 },
  icon: <AttachFileIcon />,
  attributes: [
    ["resource.interfaces"],
    ["resource.has_permission", "data.read"],
    ["resource.has_permission", "data.write"],
  ],
  condition: (it) => {
    if (!it.get("resource.interfaces").includes("IFeatureLayer")) {
      return false;
    }

    return hasExportPermission(it);
  },
  href: (it) => route("feature_attachment.page", it.id).url(),
});
