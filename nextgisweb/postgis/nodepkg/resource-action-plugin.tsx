/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import DiagnosticsIcon from "@nextgisweb/icon/material/flaky";

registerResourceAction(COMP_ID, {
  key: "postgis-diagnostics",
  icon: <DiagnosticsIcon />,
  label: gettext("Diagnostics"),
  menu: { group: "extra" },
  condition: (it) => {
    if (ngwConfig.isGuest) return false;
    const cls = it.get("resource.cls");

    return cls === "postgis_connection" || cls === "postgis_layer";
  },
  href: (it) => route("postgis.diagnostics_page", it.id).url(),
});
