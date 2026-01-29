/** @plugin */
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceChildrenAction } from "@nextgisweb/resource/resource-section/children/registry";

import DisplayIcon from "@nextgisweb/webmap/icon/display";

registerResourceChildrenAction(COMP_ID, {
    key: "display",
    label: gettext("Display"),
    icon: <DisplayIcon />,
    order: 30,
    attributes: [["resource.has_permission", "resource.read"]],
    condition: ({ cls, it }) =>
        cls === "webmap" &&
        !!it.get("resource.has_permission", "resource.read"),
    href: ({ it }) => route("webmap.display", it.id).url(),
});
