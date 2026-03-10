/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
  registerResourceAction,
  registerResourceActionGroup,
} from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import DownloadIcon from "@nextgisweb/icon/material/download";
import HistoryIcon from "@nextgisweb/icon/material/history";
import TableIcon from "@nextgisweb/icon/material/table";

declare module "@nextgisweb/resource/resource-section/registry" {
  interface ResourceActionGroupIdMap {
    feature_layer: true;
  }
}

registerResourceActionGroup({
  key: "feature_layer",
  label: gettext("Features"),
  order: 50,
});

registerResourceAction(COMP_ID, {
  key: "feature-browse",
  icon: <TableIcon />,
  label: gettext("Table"),
  menu: { order: 20, group: "feature_layer" },
  quick: { order: 60 },
  attributes: [
    ["resource.interfaces"],
    ["resource.has_permission", "data.read"],
  ],
  condition: (it) =>
    !!it.get("resource.has_permission", "data.read") &&
    !!it.get("resource.interfaces")?.includes("IFeatureLayer"),
  href: (it) => route("feature_layer.feature.browse", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "history",
  icon: <HistoryIcon />,
  label: gettext("Version history"),
  menu: { order: 40, group: "feature_layer" },
  attributes: [
    ["resource.interfaces"],
    ["feature_layer.versioning"],
    ["resource.has_permission", "data.read"],
  ],
  condition: (it) =>
    it.get("resource.has_permission", "data.read") &&
    it.get("resource.interfaces").includes("IFeatureLayer") &&
    it.get("resource.interfaces").includes("IVersionableFeatureLayer") &&
    !!it.get("feature_layer.versioning")?.enabled,
  href: (it) => route("feature_layer.feature.browse", it.id).url(),
});

registerResourceAction(COMP_ID, {
  key: "export",
  icon: <DownloadIcon />,
  label: gettext("Save as"),
  menu: { order: 60, group: "feature_layer" },
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
  href: (it) => route("resource.export.page", it.id).url(),
});
