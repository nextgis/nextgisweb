/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceChildrenAction } from "@nextgisweb/resource/resource-section/children/registry";

import TableIcon from "@nextgisweb/icon/material/table";

registerResourceChildrenAction(COMP_ID, {
    key: "table",
    label: gettext("Table"),
    icon: <TableIcon />,
    order: 20,
    attributes: [
        ["resource.interfaces"],
        ["resource.has_permission", "data.read"],
    ],
    condition: ({ it }) =>
        !!it.get("resource.has_permission", "data.read") &&
        !!it.get("resource.interfaces")?.includes("IFeatureLayer"),
    href: ({ it }) => route("feature_layer.feature.browse", it.id).url(),
});
