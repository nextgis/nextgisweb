/** @plugin */

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import DescriptionIcon from "@nextgisweb/icon/material/description";

registerResourceAction(COMP_ID, {
  key: "feature_description",
  label: gettext("Manage descriptions"),
  menu: { group: "feature_layer", order: 81 },
  icon: <DescriptionIcon />,
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
  href: (it) => route("feature_description.page", it.id).url(),
});
