/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import DiagnosticsIcon from "@nextgisweb/icon/material/flaky";

registerResourceAction(COMP_ID, {
    key: "postgis-diagnostics",
    icon: <DiagnosticsIcon />,
    label: gettext("Diagnostics"),
    order: 20,
    group: "extra",
    attributes: [
        ["resource.has_permission", "data.read"],
        ["resource.has_permission", "data.write"],
    ],
    condition: (it) => {
        if (ngwConfig.isGuest) return false;
        const cls = it.get("resource.cls");
        if (cls === "postgis_connection" || cls === "postgis_layer") {
            return hasExportPermission(it);
        }

        return false;
    },
    href: (it) => route("resource.export", it.id).url(),
});
