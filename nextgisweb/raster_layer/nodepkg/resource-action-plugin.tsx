/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import ExportIcon from "@nextgisweb/icon/material/download";
import DownloadIcon from "@nextgisweb/icon/material/download_for_offline";

registerResourceAction(COMP_ID, {
  key: "download",
  icon: <DownloadIcon />,
  label: gettext("Download"),
  menu: {
    order: 60,
    group: "resource",
  },
  attributes: [
    ["resource.has_permission", "data.read"],
    ["resource.has_permission", "data.write"],
  ],
  condition: (it) => {
    if (it.get("resource.cls") !== "raster_layer") {
      return false;
    }

    return hasExportPermission(it);
  },
  href: (it) => route("raster_layer.download", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "export",
  icon: <ExportIcon />,
  label: gettext("Save as"),
  menu: { order: 60, group: "resource" },
  attributes: [
    ["resource.has_permission", "data.read"],
    ["resource.has_permission", "data.write"],
  ],
  condition: (it) => {
    if (it.get("resource.cls") !== "raster_layer") {
      return false;
    }

    return hasExportPermission(it);
  },
  href: (it) => route("resource.export.page", it.id).url(),
});
