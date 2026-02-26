/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    registerResourceAction,
    registerResourceActionGroup,
} from "@nextgisweb/resource/resource-section/registry";
import { hasExportPermission } from "@nextgisweb/resource/util/hasExportPermission";

import ExportIcon from "@nextgisweb/icon/material/download";

declare module "@nextgisweb/resource/resource-section/registry" {
    interface ResourceActionGroupIdMap {
        svg_marker_library: true;
    }
}

registerResourceActionGroup({
    key: "svg_marker_library",
    label: gettext("SVG marker library"),
    order: 100,
});

registerResourceAction(COMP_ID, {
    key: "export",
    icon: <ExportIcon />,
    label: gettext("Export"),
    order: 0,
    group: "svg_marker_library",
    attributes: [
        ["resource.has_permission", "data.read"],
        ["resource.has_permission", "data.write"],
    ],
    condition: (it) => {
        if (it.get("resource.cls") !== "svg_marker_library") {
            return false;
        }

        return hasExportPermission(it);
    },
    href: (it) => route("resource.export", it.id).url(),
});
