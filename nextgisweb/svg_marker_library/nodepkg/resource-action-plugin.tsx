/** @plugin */
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import ExportIcon from "@nextgisweb/icon/material/download";

registerResourceAction(COMP_ID, {
  key: "export",
  icon: <ExportIcon />,
  label: gettext("Export"),
  menu: {
    order: 60,
    group: "resource",
  },
  condition: (it) => {
    return it.get("resource.cls") === "svg_marker_library";
  },
  href: (it) => routeURL("resource.export", it.id),
});
